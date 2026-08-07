import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	ATTENDANCE_REQUIRED_ON_CREATE,
	attendanceDescription,
	EMPLOYEE_REQUIRED_ON_CREATE,
	employeeDescription,
	EXPENSE_CLAIM_REQUIRED_ON_CREATE,
	expenseClaimDescription,
	JOB_APPLICANT_REQUIRED_ON_CREATE,
	JOB_OFFER_REQUIRED_ON_CREATE,
	JOB_OPENING_REQUIRED_ON_CREATE,
	jobApplicantDescription,
	jobOfferDescription,
	jobOpeningDescription,
	LEAVE_APPLICATION_REQUIRED_ON_CREATE,
	leaveApplicationDescription,
	salarySlipDescription,
} from './descriptions';
import {
	frappeApiRequest,
	frappeApiRequestAllItems,
	frappeMethodRequest,
} from './GenericFunctions';
import { getDoctype } from './types';
import type { FrappeHrmsResource } from './types';

/** Date fields (day only) among those exposed by the node. */
const DATE_FIELDS = new Set([
	'attendance_date',
	'closes_on',
	'date_of_birth',
	'date_of_joining',
	'date_of_retirement',
	'expense_date',
	'from_date',
	'half_day_date',
	'offer_date',
	'posting_date',
	'relieving_date',
	'to_date',
]);

/** Datetime fields among those exposed by the node. */
const DATETIME_FIELDS = new Set(['in_time', 'out_time', 'posted_on']);

/** Date or datetime carrying no timezone: `2026-08-15`, `2026-08-15T17:00:00`. */
const NAIVE_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::(\d{2}))?)?$/;

/**
 * Fields each resource exposes at the top level on create, outside the collection.
 *
 * Composed from the lists the descriptions declare rather than restated here: the two
 * used to be written twice and had already drifted apart in order.
 */
const REQUIRED_ON_CREATE: Record<string, string[]> = {
	employee: EMPLOYEE_REQUIRED_ON_CREATE,
	leaveApplication: LEAVE_APPLICATION_REQUIRED_ON_CREATE,
	attendance: ATTENDANCE_REQUIRED_ON_CREATE,
	expenseClaim: EXPENSE_CLAIM_REQUIRED_ON_CREATE,
	jobOpening: JOB_OPENING_REQUIRED_ON_CREATE,
	jobApplicant: JOB_APPLICANT_REQUIRED_ON_CREATE,
	jobOffer: JOB_OFFER_REQUIRED_ON_CREATE,
};

/**
 * Formats an instant as wall-clock time in a given timezone.
 *
 * `toISOString()` would yield UTC, which is wrong here: Frappe stores *naive* datetimes,
 * interpreted in the site's timezone. A check-in recorded at 09:00 in Paris must therefore
 * be sent as `09:00:00`, not `07:00:00`.
 */
function formatInTimeZone(date: Date, timeZone: string, withTime: boolean): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		...(withTime
			? ({ hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' } as const)
			: {}),
	}).formatToParts(date);

	const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
	const day = `${part('year')}-${part('month')}-${part('day')}`;

	return withTime ? `${day} ${part('hour')}:${part('minute')}:${part('second')}` : day;
}

/**
 * n8n returns dateTime fields as ISO 8601; Frappe expects `YYYY-MM-DD` for a Date field
 * and `YYYY-MM-DD HH:mm:ss` for a Datetime field, both expressed in the site's timezone.
 *
 * A value carrying a timezone (`...Z` or `...+02:00`) is converted to `timeZone`, that of
 * the n8n workflow. A value that is already naive is passed through untouched: the user
 * entered wall-clock time, and reinterpreting it would shift it.
 */
function normalizeDates(fields: IDataObject, timeZone: string): IDataObject {
	const normalized: IDataObject = {};

	for (const [key, value] of Object.entries(fields)) {
		const isDate = DATE_FIELDS.has(key);
		const isDatetime = DATETIME_FIELDS.has(key);

		if (typeof value === 'string' && value !== '' && (isDate || isDatetime)) {
			const naive = NAIVE_DATE_PATTERN.exec(value);
			if (naive !== null) {
				const [, day, time, seconds] = naive;
				normalized[key] = isDate || time === undefined ? day : `${day} ${time}:${seconds ?? '00'}`;
				continue;
			}

			const parsed = new Date(value);
			if (!Number.isNaN(parsed.getTime())) {
				normalized[key] = formatInTimeZone(parsed, timeZone, isDatetime);
				continue;
			}
		}

		normalized[key] = value;
	}

	return normalized;
}

/**
 * Turns the "Expenses" fixed collection into the `expenses` child table of an Expense
 * Claim. Frappe rejects a claim whose table is empty, so an empty collection is dropped
 * rather than sent as `[]` — that keeps "Update" from wiping the existing lines when the
 * user did not touch them.
 */
function buildExpenseRows(raw: IDataObject, timeZone: string): IDataObject[] | undefined {
	const rows = raw.expense;
	if (!Array.isArray(rows) || rows.length === 0) return undefined;

	return (rows as IDataObject[]).map((row) => normalizeDates(row, timeZone));
}

/** Parses a JSON parameter entered in the UI, tolerating an expression that already produced an object. */
function parseJsonParameter(
	context: IExecuteFunctions,
	value: unknown,
	parameterName: string,
	itemIndex: number,
): IDataObject | unknown[] | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value === 'object') return value as IDataObject | unknown[];

	if (typeof value !== 'string') return undefined;

	try {
		return JSON.parse(value) as IDataObject | unknown[];
	} catch {
		throw new NodeOperationError(
			context.getNode(),
			`Parameter "${parameterName}" is not valid JSON: ${value}`,
			{
				itemIndex,
				description:
					'Expected an object {"field": "value"} or an array [["field","operator","value"]].',
			},
		);
	}
}

/** Accepts "name,status" as ["name","status"]. */
function parseFieldList(value: string): string[] {
	const trimmed = value.trim();
	if (trimmed.startsWith('[')) {
		return JSON.parse(trimmed) as string[];
	}
	return trimmed
		.split(',')
		.map((field) => field.trim())
		.filter((field) => field.length > 0);
}

/** Documents fetched per page by the "Document" locator. It asks for more through its token. */
const SEARCH_PAGE_SIZE = 50;

/**
 * Field carrying the human-readable label of a resource, when `name` is not already it.
 *
 * Most doctypes here are autonamed with a series or a hash, so a list of bare `name` values
 * would be unusable. Exceptions, left out on purpose: none: every HR doctype is autonamed with a series.
 *
 * A wrong entry does not break the picker: `searchDocuments` retries on `name` alone when
 * Frappe rejects the field, so the list degrades to identifiers instead of erroring.
 */
const TITLE_FIELD_BY_RESOURCE: Partial<Record<FrappeHrmsResource, string>> = {
	attendance: 'employee_name',
	employee: 'employee_name',
	expenseClaim: 'employee_name',
	jobApplicant: 'applicant_name',
	jobOffer: 'applicant_name',
	jobOpening: 'job_title',
	leaveApplication: 'employee_name',
	salarySlip: 'employee_name',
};

/** Escapes the LIKE wildcards Frappe forwards to SQL, so a literal `%` searches for `%`. */
function escapeLike(value: string): string {
	return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Lists the documents of one doctype, filtered server-side.
 *
 * A plain dropdown is not an option: these doctypes grow without bound, so Frappe does the
 * filtering and the node only pages through the answer.
 */
async function searchIn(
	this: ILoadOptionsFunctions,
	doctype: string,
	titleField: string | undefined,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const start = Number(paginationToken ?? 0);

	const query = (title: string | undefined): IDataObject => {
		const qs: IDataObject = {
			fields: title === undefined ? ['name'] : ['name', title],
			order_by: 'modified desc',
			limit_start: start,
			limit_page_length: SEARCH_PAGE_SIZE,
		};

		if (filter) {
			const pattern = `%${escapeLike(filter)}%`;
			// On a titled doctype the search has to match either side: nobody looks a record up
			// by the identifier Frappe gave it.
			qs.or_filters =
				title === undefined
					? [['name', 'like', pattern]]
					: [
							['name', 'like', pattern],
							[title, 'like', pattern],
						];
		}

		return qs;
	};

	const fetch = async (title: string | undefined): Promise<IDataObject[]> =>
		await frappeApiRequest.call<
			ILoadOptionsFunctions,
			[IHttpRequestMethods, string, IDataObject, IDataObject, number],
			Promise<IDataObject[]>
		>(this, 'GET', `/api/resource/${encodeURIComponent(doctype)}`, {}, query(title), 0);

	let effectiveTitle = titleField;
	let documents: IDataObject[];
	if (effectiveTitle === undefined) {
		documents = await fetch(undefined);
	} else {
		try {
			documents = await fetch(effectiveTitle);
		} catch {
			// The title field is a mapping, not a contract: a customised doctype, or a Frappe
			// version that renamed it, makes the query fail. Falling back to `name` keeps the
			// picker usable rather than turning a cosmetic detail into a blocking error. The
			// retry cannot fail for the same reason, so the error it may raise is the real one.
			effectiveTitle = undefined;
			documents = await fetch(undefined);
		}
	}

	return {
		results: documents.map((document) => {
			const name = String(document.name);
			const title = effectiveTitle === undefined ? undefined : document[effectiveTitle];
			return {
				name: typeof title === 'string' && title !== '' ? `${name} — ${title}` : name,
				value: name,
			};
		}),
		// A short page is the last one; returning no token stops the locator from asking again.
		paginationToken:
			documents.length === SEARCH_PAGE_SIZE ? String(start + SEARCH_PAGE_SIZE) : undefined,
	};
}

/**
 * Lists the documents of the resource currently selected — the "Document" locator.
 *
 * The doctype comes from the `resource` parameter rather than from one of its own: that
 * mapping is what this node knows and the generic Frappe node does not.
 */
export async function searchDocuments(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource') as string;
	return await searchIn.call(
		this,
		getDoctype(resource),
		TITLE_FIELD_BY_RESOURCE[resource as FrappeHrmsResource],
		filter,
		paginationToken,
	);
}

/**
 * Builds the search method of a Link field, bound to the doctype that field points at.
 *
 * One method per target doctype, and not a single generic one, because n8n names the method
 * in the field (`searchListMethod`) and calls it with nothing but the filter and the
 * pagination token — it never says which field asked. `searchDocuments` gets away with a
 * single method only because it can read the `resource` parameter.
 */
function linkSearch(doctype: string, titleField?: string) {
	return async function (
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		return await searchIn.call(this, doctype, titleField, filter, paginationToken);
	};
}

/**
 * Builds the dropdown method of a Link field pointing at a configuration doctype.
 *
 * Everything is fetched in one call — `limit_page_length: 0` — which is why this is reserved
 * for lists an administrator maintains: a few dozen rows at most. Anything fed by daily
 * activity gets `linkSearch` instead, so the filtering stays on Frappe's side.
 *
 * `labelField` is for the doctypes autonamed after a code: `Loan Product` is its
 * `product_code`, so the raw list would read `ZZ-R668593`. Like the search, a rejected label
 * falls back to `name` alone rather than breaking the dropdown.
 */
function linkOptions(
	doctype: string,
	{ filters = {}, labelField }: { filters?: IDataObject; labelField?: string } = {},
) {
	return async function (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const fetch = async (label: string | undefined): Promise<IDataObject[]> => {
			const records = await frappeApiRequest.call<
				ILoadOptionsFunctions,
				[IHttpRequestMethods, string, IDataObject, IDataObject, number],
				Promise<IDataObject[]>
			>(
				this,
				'GET',
				`/api/resource/${encodeURIComponent(doctype)}`,
				{},
				{
					fields: label === undefined ? ['name'] : ['name', label],
					filters,
					limit_page_length: 0,
				},
				0,
			);

			return Array.isArray(records) ? records : [];
		};

		let effectiveLabel = labelField;
		let records: IDataObject[];
		if (effectiveLabel === undefined) {
			records = await fetch(undefined);
		} else {
			try {
				records = await fetch(effectiveLabel);
			} catch {
				effectiveLabel = undefined;
				records = await fetch(undefined);
			}
		}

		return records
			.map((record) => {
				const name = String(record.name);
				const label = effectiveLabel === undefined ? undefined : record[effectiveLabel];
				return {
					name: typeof label === 'string' && label !== '' ? `${name} — ${label}` : name,
					value: name,
				};
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	};
}

/**
 * Replaces the resource-locator objects a collection carries with the identifiers they hold.
 *
 * A locator is stored as `{ __rl: true, mode, value }`. Reading a whole collection with
 * `getNodeParameter('additionalFields', i)` returns those objects untouched: n8n only
 * unwraps a locator when the parameter is addressed by its own path with
 * `extractValue: true`, which would mean one call per field. Spreading the collection into
 * the request body without this would send Frappe an object where it expects a name.
 *
 * Only the stored `value` is taken. That is exact here because the manual mode of these
 * locators is a plain string with no `extractValue` regex of its own — the day one gains
 * one, it has to be read through `getNodeParameter` instead.
 */
function unwrapResourceLocators(collection: IDataObject): IDataObject {
	const unwrapped: IDataObject = {};

	for (const [key, value] of Object.entries(collection)) {
		const isLocator =
			value !== null && typeof value === 'object' && '__rl' in (value as IDataObject);
		unwrapped[key] = isLocator ? ((value as IDataObject).value as IDataObject[string]) : value;
	}

	return unwrapped;
}

export class FrappeHrms implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Frappe HR',
		// The product is named **Frappe HR**; `hrms` is only the app's directory name, kept as
		// an alias by Frappe itself. The label follows the product, `description` below carries
		// "(HRMS)" so the node panel still answers a search on the old name, and `name` stays
		// `frappeHrms` — it is the node type ID, written into every saved workflow.
		name: 'frappeHrms',
		// Frappe HR logo: opaque green #06b58b badge with the glyph knocked out in white.
		// A single file, hence the same green on both themes, by choice: the badge carries its
		// own background and holds contrast on light as well as dark.
		//
		// `icon-prefer-themed-variants` is silenced rather than worked around: the rule only
		// checks that `icon` is not a string literal, it never compares the two files, so the
		// { light, dark } form with the same path twice would satisfy it without changing a
		// single pixel on screen.
		//
		// Should monochrome variants ever be reintroduced: in n8n the key names the UI
		// theme, not the ink colour. A white icon belongs under `dark`, a black one under
		// `light` — the other way round makes them invisible.
		// eslint-disable-next-line @n8n/community-nodes/icon-prefer-themed-variants
		icon: 'file:../../icons/frappe-hrms.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Read and write Frappe HR (HRMS) employees, leave, attendance, expense claims and recruitment',
		defaults: {
			name: 'Frappe HR',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'frappeApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Attendance', value: 'attendance' },
					{ name: 'Employee', value: 'employee' },
					{ name: 'Expense Claim', value: 'expenseClaim' },
					{ name: 'Job Applicant', value: 'jobApplicant' },
					{ name: 'Job Offer', value: 'jobOffer' },
					{ name: 'Job Opening', value: 'jobOpening' },
					{ name: 'Leave Application', value: 'leaveApplication' },
					{ name: 'Salary Slip', value: 'salarySlip' },
				],
				default: 'employee',
			},
			...employeeDescription,
			...leaveApplicationDescription,
			...attendanceDescription,
			...expenseClaimDescription,
			...salarySlipDescription,
			...jobOpeningDescription,
			...jobApplicantDescription,
			...jobOfferDescription,
		],
	};

	methods = {
		listSearch: {
			searchDocuments,
			// Doctypes fed by daily activity, so the filtering stays server-side. A title field
			// is given only where `name` is not readable on its own — `Country` is named after
			// the country, `Account` after its own label, `Staffing Plan` is prompted for.
			searchAccount: linkSearch('Account'),
			searchCountry: linkSearch('Country'),
			searchEmployee: linkSearch('Employee', 'employee_name'),
			searchEmployeeReferral: linkSearch('Employee Referral', 'full_name'),
			searchJobApplicant: linkSearch('Job Applicant', 'applicant_name'),
			searchJobOpening: linkSearch('Job Opening', 'job_title'),
			searchJobRequisition: linkSearch('Job Requisition', 'designation'),
			searchLeaveApplication: linkSearch('Leave Application', 'employee_name'),
			searchProject: linkSearch('Project', 'project_name'),
			searchStaffingPlan: linkSearch('Staffing Plan'),
			searchTask: linkSearch('Task', 'subject'),
			searchUser: linkSearch('User', 'full_name'),
		},
		loadOptions: {
			// Configuration doctypes: an administrator maintains them, so the whole list fits.
			getBranches: linkOptions('Branch'),
			getCompanies: linkOptions('Company'),
			getCostCenters: linkOptions('Cost Center'),
			// Frappe seeds the full ISO list — around 150 rows — but a site enables a handful.
			// Filtering on `enabled` is what keeps this a dropdown rather than a search.
			getCurrencies: linkOptions('Currency', { filters: { enabled: 1 } }),
			getDepartments: linkOptions('Department'),
			getDesignations: linkOptions('Designation'),
			getEmployeeGrades: linkOptions('Employee Grade'),
			getEmploymentTypes: linkOptions('Employment Type'),
			getGenders: linkOptions('Gender'),
			getHolidayLists: linkOptions('Holiday List'),
			getJobApplicantSources: linkOptions('Job Applicant Source'),
			getLeaveTypes: linkOptions('Leave Type'),
			getModesOfPayment: linkOptions('Mode of Payment'),
			getShiftTypes: linkOptions('Shift Type'),
			getTermsAndConditions: linkOptions('Terms and Conditions'),
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const doctype = getDoctype(resource);
		const basePath = `/api/resource/${encodeURIComponent(doctype)}`;
		const timeZone = this.getTimezone();

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'create' || operation === 'update') {
					const collectionName = operation === 'create' ? 'additionalFields' : 'updateFields';
					const collected = unwrapResourceLocators(
						this.getNodeParameter(collectionName, i, {}) as IDataObject,
					);

					let body: IDataObject = { ...collected };

					// Required fields are exposed at the top level, outside the collection.
					if (operation === 'create') {
						for (const field of REQUIRED_ON_CREATE[resource] ?? []) {
							// `extractValue` because several of these are Link fields, now resource
							// locators: read without it they arrive as `{ __rl, mode, value }`.
							body[field] = this.getNodeParameter(field, i, undefined, { extractValue: true });
						}
					}

					body = normalizeDates(body, timeZone);

					if (resource === 'expenseClaim') {
						const expenses = buildExpenseRows(
							this.getNodeParameter('expenses', i, {}) as IDataObject,
							timeZone,
						);
						if (expenses !== undefined) body.expenses = expenses;

						// Frappe HR v16 made `exchange_rate` mandatory on Expense Claim, but only the
						// Desk form fills it — through a client script that reacts to `currency`. A
						// plain REST insert therefore fails with "Value missing for Expense Claim:
						// Exchange Rate". 1 is the right rate whenever the claim is in the company
						// currency, which is the default since `currency` is fetched from the
						// employee. Any other currency needs the field set explicitly.
						if (operation === 'create' && body.exchange_rate === undefined) {
							body.exchange_rate = 1;
						}
					}

					if (operation === 'create') {
						const created = await frappeApiRequest.call(this, 'POST', basePath, body, {}, i);
						returnData.push({ json: created as IDataObject, pairedItem: { item: i } });
					} else {
						const documentId = this.getNodeParameter('documentId', i, undefined, {
							extractValue: true,
						}) as string;
						const updated = await frappeApiRequest.call(
							this,
							'PUT',
							`${basePath}/${encodeURIComponent(documentId)}`,
							body,
							{},
							i,
						);
						returnData.push({ json: updated as IDataObject, pairedItem: { item: i } });
					}
				} else if (operation === 'get') {
					const documentId = this.getNodeParameter('documentId', i, undefined, {
						extractValue: true,
					}) as string;
					const document = await frappeApiRequest.call(
						this,
						'GET',
						`${basePath}/${encodeURIComponent(documentId)}`,
						{},
						{},
						i,
					);
					returnData.push({ json: document as IDataObject, pairedItem: { item: i } });
				} else if (operation === 'delete') {
					const documentId = this.getNodeParameter('documentId', i, undefined, {
						extractValue: true,
					}) as string;
					await frappeApiRequest.call(
						this,
						'DELETE',
						`${basePath}/${encodeURIComponent(documentId)}`,
						{},
						{},
						i,
					);
					returnData.push({
						json: { success: true, doctype, name: documentId },
						pairedItem: { item: i },
					});
				} else if (operation === 'approve' || operation === 'reject') {
					const documentId = this.getNodeParameter('documentId', i, undefined, {
						extractValue: true,
					}) as string;
					const approvalOptions = this.getNodeParameter('approvalOptions', i, {}) as IDataObject;
					const status = operation === 'approve' ? 'Approved' : 'Rejected';
					const path = `${basePath}/${encodeURIComponent(documentId)}`;

					// The status has to be read back before writing: HRMS refuses to submit a leave
					// application whose status is still Open, and Frappe refuses to touch a
					// document that is already submitted.
					const current = (await frappeApiRequest.call(
						this,
						'GET',
						path,
						{},
						{},
						i,
					)) as IDataObject;

					const docstatus = Number(current.docstatus ?? 0);
					if (docstatus !== 0) {
						throw new NodeOperationError(
							this.getNode(),
							docstatus === 1
								? `Request ${documentId} is already submitted: its status can no longer be changed`
								: `Request ${documentId} is cancelled: its status can no longer be changed`,
							{
								itemIndex: i,
								description:
									'Frappe freezes the fields of a submitted document. It has to be cancelled then amended (Amend) to start again from a draft.',
							},
						);
					}

					const changes: IDataObject = { status };
					if (
						typeof approvalOptions.leave_approver === 'string' &&
						approvalOptions.leave_approver !== ''
					) {
						changes.leave_approver = approvalOptions.leave_approver;
					}

					// `submit` defaults to true: approving without submitting leaves the leave
					// balance untouched, which is rarely what the workflow means.
					const shouldSubmit = approvalOptions.submit !== false;

					const result = shouldSubmit
						? await frappeMethodRequest.call(
								this,
								'frappe.client.submit',
								{ doc: { ...current, ...changes } },
								i,
							)
						: await frappeApiRequest.call(this, 'PUT', path, changes, {}, i);

					returnData.push({ json: result as IDataObject, pairedItem: { item: i } });
				} else if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i, {}) as IDataObject;

					const qs: IDataObject = {};

					// Without `fields`, Frappe returns the `name` column only.
					qs.fields =
						typeof options.fields === 'string' && options.fields.trim() !== ''
							? parseFieldList(options.fields)
							: ['*'];

					const filters = parseJsonParameter(this, options.filters, 'Filters (JSON)', i);
					if (filters !== undefined) qs.filters = filters;

					const orFilters = parseJsonParameter(this, options.orFilters, 'Or Filters (JSON)', i);
					if (orFilters !== undefined) qs.or_filters = orFilters;

					if (typeof options.sortField === 'string' && options.sortField.trim() !== '') {
						const sortOrder = (options.sortOrder as string) ?? 'desc';
						qs.order_by = `${options.sortField.trim()} ${sortOrder}`;
					}

					let records: IDataObject[];
					if (returnAll) {
						records = await frappeApiRequestAllItems.call(this, basePath, qs, i);
					} else {
						qs.limit_page_length = this.getNodeParameter('limit', i) as number;
						qs.limit_start = (options.offset as number) ?? 0;
						records = await frappeApiRequest.call<
							IExecuteFunctions,
							Parameters<typeof frappeApiRequest>,
							Promise<IDataObject[]>
						>(this, 'GET', basePath, {}, qs, i);
					}

					for (const record of records) {
						returnData.push({ json: record, pairedItem: { item: i } });
					}
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported`,
						{ itemIndex: i },
					);
				}
			} catch (error) {
				// frappeApiRequest already throws a NodeApiError carrying the Frappe message;
				// only unexpected errors get wrapped here.
				const nodeError =
					error instanceof NodeApiError || error instanceof NodeOperationError
						? error
						: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });

				if (this.continueOnFail()) {
					returnData.push({
						json: { error: nodeError.message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw nodeError;
			}
		}

		return [returnData];
	}
}
