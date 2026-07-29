import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

/**
 * `Employee` fields offered on create as well as update.
 *
 * The doctype belongs to ERPNext (`erpnext/setup/doctype/employee`), not to HRMS. The
 * fields marked « custom field HRMS » below are added by `hrms/setup.py` when Frappe HR is
 * installed — they do not exist on a bare ERPNext site.
 *
 * Read-only fields are left out on purpose: `employee_name` is recomputed from the name
 * parts, `prefered_email` from the email fields.
 */
const employeeFields: INodeProperties[] = [
	{
		displayName: 'Branch',
		name: 'branch',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Branch',
	},
	{
		displayName: 'Cell Number',
		name: 'cell_number',
		type: 'string',
		default: '',
		description: 'Numéro de mobile personnel',
	},
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Company',
	},
	{
		displayName: 'Company Email',
		name: 'company_email',
		type: 'string',
		placeholder: 'nom@societe.com',
		default: '',
		description: "Adresse email professionnelle",
	},
	{
		displayName: 'Date of Birth',
		name: 'date_of_birth',
		type: 'dateTime',
		default: '',
		description: 'Date de naissance',
	},
	{
		displayName: 'Date of Joining',
		name: 'date_of_joining',
		type: 'dateTime',
		default: '',
		description: "Date d'entrée dans l'entreprise",
	},
	{
		displayName: 'Date of Retirement',
		name: 'date_of_retirement',
		type: 'dateTime',
		default: '',
		description: 'Date de départ à la retraite',
	},
	{
		displayName: 'Default Shift',
		name: 'default_shift',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Shift Type (custom field HRMS)',
	},
	{
		displayName: 'Department',
		name: 'department',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Department',
	},
	{
		displayName: 'Designation',
		name: 'designation',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Designation (intitulé de poste)',
	},
	{
		displayName: 'Employee Number',
		name: 'employee_number',
		type: 'string',
		default: '',
		description: "Matricule interne, distinct du champ « name » généré par Frappe",
	},
	{
		displayName: 'Employment Type',
		name: 'employment_type',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Employment Type, par ex. Full-time (custom field HRMS).',
	},
	{
		displayName: 'Expense Approver',
		name: 'expense_approver',
		type: 'string',
		default: '',
		description:
			"Email de l'utilisateur habilité à valider les notes de frais (custom field HRMS)",
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		description: "Prénom de l'employé",
	},
	{
		displayName: 'Gender',
		name: 'gender',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Gender (ex. Male, Female).',
	},
	{
		displayName: 'Grade',
		name: 'grade',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Employee Grade (custom field HRMS)',
	},
	{
		displayName: 'Holiday List',
		name: 'holiday_list',
		type: 'string',
		default: '',
		description:
			'Lien vers un enregistrement du doctype Holiday List, utilisé pour le calcul des congés',
	},
	{
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		default: '',
		description: 'Nom de famille',
	},
	{
		displayName: 'Leave Approver',
		name: 'leave_approver',
		type: 'string',
		default: '',
		description:
			"Email de l'utilisateur habilité à valider les demandes de congé (custom field HRMS)",
	},
	{
		displayName: 'Middle Name',
		name: 'middle_name',
		type: 'string',
		default: '',
		description: 'Deuxième prénom',
	},
	{
		displayName: 'Personal Email',
		name: 'personal_email',
		type: 'string',
		placeholder: 'nom@email.com',
		default: '',
		description: 'Adresse email personnelle',
	},
	{
		displayName: 'Relieving Date',
		name: 'relieving_date',
		type: 'dateTime',
		default: '',
		description: "Date de sortie des effectifs. Requise par Frappe pour passer le statut à Left.",
	},
	{
		displayName: 'Reports To',
		name: 'reports_to',
		type: 'string',
		default: '',
		description: 'Champ « name » de l\'employé responsable, par ex. HR-EMP-00002.',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{ name: 'Active', value: 'Active' },
			{ name: 'Inactive', value: 'Inactive' },
			{ name: 'Left', value: 'Left' },
			{ name: 'Suspended', value: 'Suspended' },
		],
		default: 'Active',
		description: "Statut administratif de l'employé",
	},
	{
		displayName: 'User ID',
		name: 'user_id',
		type: 'string',
		default: '',
		description: "Email du compte utilisateur Frappe associé à l'employé",
	},
];

const REQUIRED_ON_CREATE = ['first_name', 'gender', 'date_of_birth', 'date_of_joining', 'company'];

export const employeeDescription: INodeProperties[] = [
	operationsFor('employee', 'employee'),
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['employee'], operation: ['create'] } },
		description: "Prénom de l'employé",
	},
	{
		displayName: 'Gender',
		name: 'gender',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['employee'], operation: ['create'] } },
		description: 'Lien vers un enregistrement du doctype Gender (ex. Male, Female).',
	},
	{
		displayName: 'Date of Birth',
		name: 'date_of_birth',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['employee'], operation: ['create'] } },
		description: 'Date de naissance',
	},
	{
		displayName: 'Date of Joining',
		name: 'date_of_joining',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['employee'], operation: ['create'] } },
		description: "Date d'entrée dans l'entreprise",
	},
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['employee'], operation: ['create'] } },
		description: 'Lien vers un enregistrement du doctype Company',
	},
	documentIdField(
		'employee',
		'Champ « name » de l\'enregistrement Frappe. Pour un employé il ressemble à HR-EMP-00001.',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['employee'], operation: ['create'] } },
		options: omitFields(employeeFields, REQUIRED_ON_CREATE),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['employee'], operation: ['update'] } },
		options: employeeFields,
	},
	...getManyFields('employee'),
];
