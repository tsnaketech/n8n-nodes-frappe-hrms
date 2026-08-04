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
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Company',
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Currency, par ex. EUR.',
	},
	{
		displayName: 'Department',
		name: 'department',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Department',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: "Descriptif du poste. Champ Text Editor : il accepte du HTML.",
	},
	{
		displayName: 'Designation',
		name: 'designation',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Designation',
	},
	{
		displayName: 'Employment Type',
		name: 'employment_type',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Employment Type, par ex. Full-time ou Intern.',
	},
	{
		displayName: 'Job Requisition',
		name: 'job_requisition',
		type: 'string',
		default: '',
		description: 'The "name" field of the staffing plan request behind the opening',
	},
	{
		displayName: 'Job Title',
		name: 'job_title',
		type: 'string',
		default: '',
		description: 'Job title as published',
	},
	{
		displayName: 'Location',
		name: 'location',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Branch',
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
		description: 'Date de publication',
	},
	{
		displayName: 'Staffing Plan',
		name: 'staffing_plan',
		type: 'string',
		default: '',
		description: 'The "name" field of the related staffing plan',
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
		description: 'Statut de publication du poste',
	},
	{
		displayName: 'Upper Range',
		name: 'upper_range',
		type: 'number',
		default: 0,
		description: 'Upper bound of the salary range',
	},
];

const REQUIRED_ON_CREATE = ['job_title', 'company', 'designation'];

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
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobOpening'], operation: ['create'] } },
		description: 'Lien vers un enregistrement du doctype Company',
	},
	{
		displayName: 'Designation',
		name: 'designation',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobOpening'], operation: ['create'] } },
		description: 'Lien vers un enregistrement du doctype Designation',
	},
	documentIdField(
		'jobOpening',
		'The Frappe record "name" field. For a job opening it looks like HR-OPN-2026-0001.',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['jobOpening'], operation: ['create'] } },
		options: omitFields(jobOpeningFields, REQUIRED_ON_CREATE),
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
