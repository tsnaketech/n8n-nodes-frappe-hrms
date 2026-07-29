import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

/** `Job Opening` fields offered on create as well as update. */
const jobOpeningFields: INodeProperties[] = [
	{
		displayName: 'Closes On',
		name: 'closes_on',
		type: 'dateTime',
		default: '',
		description: "Date de clôture des candidatures",
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
		description: 'Champ « name » de la demande de recrutement à l\'origine du poste',
	},
	{
		displayName: 'Job Title',
		name: 'job_title',
		type: 'string',
		default: '',
		description: "Intitulé du poste tel qu'il est publié",
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
		description: 'Bas de la fourchette de rémunération',
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
		description: 'Champ « name » du plan de recrutement associé',
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
		description: 'Haut de la fourchette de rémunération',
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
		description: "Intitulé du poste tel qu'il est publié",
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
		'Champ « name » de l\'enregistrement Frappe. Pour une offre il ressemble à HR-OPN-2026-0001.',
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
