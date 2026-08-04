import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

/** `Job Applicant` fields offered on create as well as update. */
const jobApplicantFields: INodeProperties[] = [
	{
		displayName: 'Applicant Name',
		name: 'applicant_name',
		type: 'string',
		default: '',
		description: 'Nom complet du candidat',
	},
	{
		displayName: 'Country',
		name: 'country',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Country',
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
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Currency, par ex. EUR.',
	},
	{
		displayName: 'Designation',
		name: 'designation',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Designation',
	},
	{
		displayName: 'Email ID',
		name: 'email_id',
		type: 'string',
		placeholder: 'nom@email.com',
		default: '',
		description: 'Adresse email du candidat',
	},
	{
		displayName: 'Employee Referral',
		name: 'employee_referral',
		type: 'string',
		default: '',
		description: 'The "name" field of the employee referral behind the application',
	},
	{
		displayName: 'Job Opening',
		name: 'job_title',
		type: 'string',
		default: '',
		description:
			'The "name" field of the targeted opening, e.g. HR-OPN-2026-0001. The Frappe field is called job_title but does point at the Job Opening doctype.',
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
		displayName: 'Source',
		name: 'source',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Job Applicant Source, par ex. Website Listing.',
	},
	{
		displayName: 'Source Name',
		name: 'source_name',
		type: 'string',
		default: '',
		description: 'The "name" field of the referring employee when the source is a referral',
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
		description: 'Étape du candidat dans le processus de recrutement',
	},
	{
		displayName: 'Upper Range',
		name: 'upper_range',
		type: 'number',
		default: 0,
		description: 'Upper bound of the expected salary',
	},
];

const REQUIRED_ON_CREATE = ['applicant_name', 'email_id'];

export const jobApplicantDescription: INodeProperties[] = [
	operationsFor('jobApplicant', 'job applicant'),
	{
		displayName: 'Applicant Name',
		name: 'applicant_name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobApplicant'], operation: ['create'] } },
		description: 'Nom complet du candidat',
	},
	{
		displayName: 'Email ID',
		name: 'email_id',
		type: 'string',
		placeholder: 'nom@email.com',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobApplicant'], operation: ['create'] } },
		description: 'Adresse email du candidat',
	},
	documentIdField(
		'jobApplicant',
		'The Frappe record "name" field. For an applicant it looks like HR-APP-2026-00001.',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['jobApplicant'], operation: ['create'] } },
		options: omitFields(jobApplicantFields, REQUIRED_ON_CREATE),
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
