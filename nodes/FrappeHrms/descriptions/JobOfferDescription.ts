import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

/**
 * `Job Offer` fields offered on create as well as update.
 *
 * `applicant_name` is `reqd` on the doctype but carries a `fetch_from` on the job
 * applicant, so Frappe fills it in itself — it is not exposed here.
 */
const jobOfferFields: INodeProperties[] = [
	{
		displayName: 'Company Name or ID',
		name: 'company',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCompanies' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Designation Name or ID',
		name: 'designation',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getDesignations' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Job Applicant',
		name: 'job_applicant',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The "name" field of the applicant, e.g. HR-APP-2026-00001',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchJobApplicant',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'HR-APP-2026-00001',
			},
		],
	},
	{
		displayName: 'Offer Date',
		name: 'offer_date',
		type: 'dateTime',
		default: '',
		description: 'Date the offer was issued',
	},
	{
		displayName: 'Select Terms Name or ID',
		name: 'select_terms',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getTermsAndConditions' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{ name: 'Accepted', value: 'Accepted' },
			{ name: 'Awaiting Response', value: 'Awaiting Response' },
			{ name: 'Cancelled', value: 'Cancelled' },
			{ name: 'Rejected', value: 'Rejected' },
		],
		default: 'Awaiting Response',
		description: 'Applicant response to the offer',
	},
	{
		displayName: 'Terms',
		name: 'terms',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'Terms of the offer. Text Editor field: it accepts HTML.',
	},
];

/**
 * Fields exposed at the top level on create, outside the collection.
 *
 * The node imports this list to know which parameters to read there, so the fields
 * drawn here and the fields sent cannot drift apart.
 */
export const JOB_OFFER_REQUIRED_ON_CREATE = [
	'job_applicant',
	'offer_date',
	'designation',
	'company',
];

export const jobOfferDescription: INodeProperties[] = [
	operationsFor('jobOffer', 'job offer'),
	{
		displayName: 'Job Applicant',
		name: 'job_applicant',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: { resource: ['jobOffer'], operation: ['create'] } },
		description: 'The "name" field of the applicant, e.g. HR-APP-2026-00001',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchJobApplicant',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'HR-APP-2026-00001',
			},
		],
	},
	{
		displayName: 'Offer Date',
		name: 'offer_date',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobOffer'], operation: ['create'] } },
		description: 'Date the offer was issued',
	},
	{
		displayName: 'Designation Name or ID',
		name: 'designation',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getDesignations' },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobOffer'], operation: ['create'] } },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Company Name or ID',
		name: 'company',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCompanies' },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobOffer'], operation: ['create'] } },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	documentIdField(
		'jobOffer',
		'The Frappe record "name" field. For a job offer it looks like HR-OFF-2026-00001.',
		undefined,
		'HR-OFF-2026-00001',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['jobOffer'], operation: ['create'] } },
		options: omitFields(jobOfferFields, JOB_OFFER_REQUIRED_ON_CREATE),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['jobOffer'], operation: ['update'] } },
		options: jobOfferFields,
	},
	...getManyFields('jobOffer'),
];
