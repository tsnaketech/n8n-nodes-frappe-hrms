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
		description: 'Champ « name » de la cooptation à l\'origine de la candidature',
	},
	{
		displayName: 'Job Opening',
		name: 'job_title',
		type: 'string',
		default: '',
		description:
			'Champ « name » de l\'offre visée, par ex. HR-OPN-2026-0001. Le champ Frappe s\'appelle job_title mais pointe bien sur le doctype Job Opening.',
	},
	{
		displayName: 'Lower Range',
		name: 'lower_range',
		type: 'number',
		default: 0,
		description: 'Bas de la prétention salariale',
	},
	{
		displayName: 'Phone Number',
		name: 'phone_number',
		type: 'string',
		default: '',
		description: 'Numéro de téléphone du candidat',
	},
	{
		displayName: 'Resume Link',
		name: 'resume_link',
		type: 'string',
		default: '',
		description: 'URL du CV hébergé ailleurs, par ex. un profil LinkedIn.',
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
		description: "Champ « name » de l'employé référent lorsque la source est une cooptation",
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
		description: 'Haut de la prétention salariale',
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
		'Champ « name » de l\'enregistrement Frappe. Pour un candidat il ressemble à HR-APP-2026-00001.',
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
