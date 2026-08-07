import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

/** `Job Opening` fields offered on create as well as update. */
const jobOpeningFields: INodeProperties[] = [
	{
		displayName: 'Closes On',
		name: 'closes_on',
		type: 'dateTime',
		default: '',
		description: 'Date applications close',
	},
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
		displayName: 'Currency Name or ID',
		name: 'currency',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCurrencies' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Department Name or ID',
		name: 'department',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'Description of the job. Text Editor field: it accepts HTML.',
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
		displayName: 'Employment Type Name or ID',
		name: 'employment_type',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getEmploymentTypes' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Job Requisition',
		name: 'job_requisition',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The "name" field of the staffing plan request behind the opening',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchJobRequisition',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'HR-JRQ-2026-00001',
			},
		],
	},
	{
		displayName: 'Job Title',
		name: 'job_title',
		type: 'string',
		default: '',
		description: 'Job title as published',
	},
	{
		displayName: 'Location Name or ID',
		name: 'location',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getBranches' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Lower Range',
		name: 'lower_range',
		type: 'number',
		default: 0,
		description: 'Lower bound of the salary range',
	},
	{
		displayName: 'Posted On',
		name: 'posted_on',
		type: 'dateTime',
		default: '',
		description: 'Publication date',
	},
	{
		displayName: 'Staffing Plan',
		name: 'staffing_plan',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The "name" field of the related staffing plan',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchStaffingPlan',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Plan 2026',
			},
		],
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{ name: 'Closed', value: 'Closed' },
			{ name: 'Open', value: 'Open' },
		],
		default: 'Open',
		description: 'Publication status of the job opening',
	},
	{
		displayName: 'Upper Range',
		name: 'upper_range',
		type: 'number',
		default: 0,
		description: 'Upper bound of the salary range',
	},
];

/**
 * Fields exposed at the top level on create, outside the collection.
 *
 * The node imports this list to know which parameters to read there, so the fields
 * drawn here and the fields sent cannot drift apart.
 */
export const JOB_OPENING_REQUIRED_ON_CREATE = ['job_title', 'company', 'designation'];

export const jobOpeningDescription: INodeProperties[] = [
	operationsFor('jobOpening', 'job opening'),
	{
		displayName: 'Job Title',
		name: 'job_title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobOpening'], operation: ['create'] } },
		description: 'Job title as published',
	},
	{
		displayName: 'Company Name or ID',
		name: 'company',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCompanies' },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobOpening'], operation: ['create'] } },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Designation Name or ID',
		name: 'designation',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getDesignations' },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobOpening'], operation: ['create'] } },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	documentIdField(
		'jobOpening',
		'The Frappe record "name" field. For a job opening it looks like HR-OPN-2026-0001.',
		undefined,
		'HR-OPN-2026-0001',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['jobOpening'], operation: ['create'] } },
		options: omitFields(jobOpeningFields, JOB_OPENING_REQUIRED_ON_CREATE),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['jobOpening'], operation: ['update'] } },
		options: jobOpeningFields,
	},
	...getManyFields('jobOpening'),
];
