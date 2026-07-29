import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	attendanceDescription,
	employeeDescription,
	expenseClaimDescription,
	jobApplicantDescription,
	jobOfferDescription,
	jobOpeningDescription,
	leaveApplicationDescription,
	salarySlipDescription,
} from './descriptions';
import {
	frappeApiRequest,
	frappeApiRequestAllItems,
	frappeMethodRequest,
} from './GenericFunctions';
import { getDoctype } from './types';

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
 * Fields exposed at the top level, outside the « Additional Fields » collection, because
 * the doctype marks them `reqd`. Kept here rather than in the descriptions so that the
 * execute loop has a single place to read them from.
 */
const REQUIRED_ON_CREATE: Record<string, string[]> = {
	employee: ['first_name', 'gender', 'date_of_birth', 'date_of_joining', 'company'],
	leaveApplication: ['employee', 'leave_type', 'from_date', 'to_date'],
	attendance: ['employee', 'attendance_date', 'status'],
	expenseClaim: ['employee'],
	jobOpening: ['job_title', 'company', 'designation'],
	jobApplicant: ['applicant_name', 'email_id'],
	jobOffer: ['job_applicant', 'offer_date', 'designation', 'company'],
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
 * Turns the « Expenses » fixed collection into the `expenses` child table of an Expense
 * Claim. Frappe rejects a claim whose table is empty, so an empty collection is dropped
 * rather than sent as `[]` — that keeps « Update » from wiping the existing lines when the
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
			`Le paramètre « ${parameterName} » n'est pas du JSON valide : ${value}`,
			{
				itemIndex,
				description:
					'Attendu : un objet {"champ": "valeur"} ou un tableau [["champ","opérateur","valeur"]].',
			},
		);
	}
}

/** Accepte « name,status » comme ["name","status"]. */
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

export class FrappeHrms implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Frappe HRMS',
		name: 'frappeHrms',
		// Frappe HR logo: opaque green #06b58b badge with the glyph knocked out in white.
		// A single file, hence the same green on both themes, by choice: the badge carries its
		// own background and holds contrast on light as well as dark. This leaves the
		// `icon-prefer-themed-variants` warning (non-blocking, lint exits 0); the
		// { light, dark } form requires two distinct file paths, hence a different tint on one
		// of the themes.
		icon: 'file:../../icons/frappe-hr.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Lire et écrire les employés, congés, pointages, notes de frais et recrutements de Frappe HR',
		defaults: {
			name: 'Frappe HRMS',
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
					const collected = this.getNodeParameter(collectionName, i, {}) as IDataObject;

					let body: IDataObject = { ...collected };

					// Required fields are exposed at the top level, outside the collection.
					if (operation === 'create') {
						for (const field of REQUIRED_ON_CREATE[resource] ?? []) {
							body[field] = this.getNodeParameter(field, i);
						}
					}

					body = normalizeDates(body, timeZone);

					if (resource === 'expenseClaim') {
						const expenses = buildExpenseRows(
							this.getNodeParameter('expenses', i, {}) as IDataObject,
							timeZone,
						);
						if (expenses !== undefined) body.expenses = expenses;
					}

					if (operation === 'create') {
						const created = await frappeApiRequest.call(this, 'POST', basePath, body, {}, i);
						returnData.push({ json: created as IDataObject, pairedItem: { item: i } });
					} else {
						const documentId = this.getNodeParameter('documentId', i) as string;
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
					const documentId = this.getNodeParameter('documentId', i) as string;
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
					const documentId = this.getNodeParameter('documentId', i) as string;
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
					const documentId = this.getNodeParameter('documentId', i) as string;
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
								? `La demande ${documentId} est déjà soumise : son statut ne peut plus être modifié`
								: `La demande ${documentId} est annulée : son statut ne peut plus être modifié`,
							{
								itemIndex: i,
								description:
									'Frappe fige les champs d\'un document soumis. Il faut l\'annuler puis l\'amender (Amend) pour repartir d\'un brouillon.',
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
						`L'opération « ${operation} » n'est pas supportée`,
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
