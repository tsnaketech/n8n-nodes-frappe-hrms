import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

/** `Job Applicant` fields offered on create as well as update. */
const jobApplicantFields: INodeProperties[] = [
	{
		displayName: 'Applicant Name',
		name: 'applicant_name',
		type: 'string',
		default: '',
		description: 'Full name of the applicant',
	},
	{
		displayName: 'Country',
		name: 'country',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Link to a Country record',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchCountry',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'France',
			},
		],
	},
	{
		displayName: 'Cover Letter',
		name: 'cover_letter',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'Lettre de motivation',
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
		displayName: 'Designation Name or ID',
		name: 'designation',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getDesignations' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Email ID',
		name: 'email_id',
		type: 'string',
		placeholder: 'name@example.com',
		default: '',
		description: "Applicant's e-mail address",
	},
	{
		displayName: 'Employee Referral',
		name: 'employee_referral',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The "name" field of the employee referral behind the application',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchEmployeeReferral',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'HR-REF-0001',
			},
		],
	},
	{
		displayName: 'Job Opening',
		name: 'job_title',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description:
			'The "name" field of the targeted opening, e.g. HR-OPN-2026-0001. The Frappe field is called job_title but does point at the Job Opening doctype.',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchJobOpening',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'HR-OPN-2026-0001',
			},
		],
	},
	{
		displayName: 'Lower Range',
		name: 'lower_range',
		type: 'number',
		default: 0,
		description: 'Lower bound of the expected salary',
	},
	{
		displayName: 'Phone Number',
		name: 'phone_number',
		type: 'string',
		default: '',
		description: 'Applicant phone number',
	},
	{
		displayName: 'Resume Link',
		name: 'resume_link',
		type: 'string',
		default: '',
		description: 'URL of a resume hosted elsewhere, e.g. a LinkedIn profile',
	},
	{
		displayName: 'Source Name or ID',
		name: 'source',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getJobApplicantSources' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Source Name',
		name: 'source_name',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The "name" field of the referring employee when the source is a referral',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchEmployee',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'HR-EMP-00001',
			},
		],
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{ name: 'Accepted', value: 'Accepted' },
			{ name: 'Hold', value: 'Hold' },
			{ name: 'Open', value: 'Open' },
			{ name: 'Rejected', value: 'Rejected' },
			{ name: 'Replied', value: 'Replied' },
			{ name: 'Shortlisted', value: 'Shortlisted' },
		],
		default: 'Open',
		description: 'Stage of the applicant in the recruitment process',
	},
	{
		displayName: 'Upper Range',
		name: 'upper_range',
		type: 'number',
		default: 0,
		description: 'Upper bound of the expected salary',
	},
];

/**
 * Fields exposed at the top level on create, outside the collection.
 *
 * The node imports this list to know which parameters to read there, so the fields
 * drawn here and the fields sent cannot drift apart.
 */
export const JOB_APPLICANT_REQUIRED_ON_CREATE = ['applicant_name', 'email_id'];

export const jobApplicantDescription: INodeProperties[] = [
	operationsFor('jobApplicant', 'job applicant'),
	{
		displayName: 'Applicant Name',
		name: 'applicant_name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobApplicant'], operation: ['create'] } },
		description: 'Full name of the applicant',
	},
	{
		displayName: 'Email ID',
		name: 'email_id',
		type: 'string',
		placeholder: 'name@example.com',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobApplicant'], operation: ['create'] } },
		description: "Applicant's e-mail address",
	},
	documentIdField(
		'jobApplicant',
		'The Frappe record "name" field. For an applicant it looks like HR-APP-2026-00001.',
		undefined,
		'HR-APP-2026-00001',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['jobApplicant'], operation: ['create'] } },
		options: omitFields(jobApplicantFields, JOB_APPLICANT_REQUIRED_ON_CREATE),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['jobApplicant'], operation: ['update'] } },
		options: jobApplicantFields,
	},
	...getManyFields('jobApplicant'),
];
