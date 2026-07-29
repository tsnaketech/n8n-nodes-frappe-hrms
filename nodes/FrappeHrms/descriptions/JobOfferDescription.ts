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
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Company',
	},
	{
		displayName: 'Designation',
		name: 'designation',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Designation',
	},
	{
		displayName: 'Job Applicant',
		name: 'job_applicant',
		type: 'string',
		default: '',
		description: 'Champ « name » du candidat, par ex. HR-APP-2026-00001.',
	},
	{
		displayName: 'Offer Date',
		name: 'offer_date',
		type: 'dateTime',
		default: '',
		description: "Date d'émission de la proposition",
	},
	{
		displayName: 'Select Terms',
		name: 'select_terms',
		type: 'string',
		default: '',
		description:
			'Lien vers un enregistrement du doctype Terms and Conditions, dont le contenu remplit « Terms »',
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
		description: 'Réponse du candidat à la proposition',
	},
	{
		displayName: 'Terms',
		name: 'terms',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'Conditions de la proposition. Champ Text Editor : il accepte du HTML.',
	},
];

const REQUIRED_ON_CREATE = ['job_applicant', 'offer_date', 'designation', 'company'];

export const jobOfferDescription: INodeProperties[] = [
	operationsFor('jobOffer', 'job offer'),
	{
		displayName: 'Job Applicant',
		name: 'job_applicant',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobOffer'], operation: ['create'] } },
		description: 'Champ « name » du candidat, par ex. HR-APP-2026-00001.',
	},
	{
		displayName: 'Offer Date',
		name: 'offer_date',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobOffer'], operation: ['create'] } },
		description: "Date d'émission de la proposition",
	},
	{
		displayName: 'Designation',
		name: 'designation',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobOffer'], operation: ['create'] } },
		description: 'Lien vers un enregistrement du doctype Designation',
	},
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['jobOffer'], operation: ['create'] } },
		description: 'Lien vers un enregistrement du doctype Company',
	},
	documentIdField(
		'jobOffer',
		'Champ « name » de l\'enregistrement Frappe. Pour une proposition il ressemble à HR-OFF-2026-00001.',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['jobOffer'], operation: ['create'] } },
		options: omitFields(jobOfferFields, REQUIRED_ON_CREATE),
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
