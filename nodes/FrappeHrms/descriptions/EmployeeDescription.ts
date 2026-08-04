import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

/**
 * `Employee` fields offered on create as well as update.
 *
 * The doctype belongs to ERPNext (`erpnext/setup/doctype/employee`), not to HRMS. The
 * fields marked "custom field HRMS" below are added by `hrms/setup.py` when Frappe HR is
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
		description: 'Personal mobile number',
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
		description: 'Date the employee joined the company',
	},
	{
		displayName: 'Date of Retirement',
		name: 'date_of_retirement',
		type: 'dateTime',
		default: '',
		description: 'Retirement date',
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
		description: 'Link to a Designation doctype record (job title)',
	},
	{
		displayName: 'Employee Number',
		name: 'employee_number',
		type: 'string',
		default: '',
		description: 'Internal employee number, distinct from the "name" field Frappe generates',
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
			'Email of the user allowed to approve expense claims (HRMS custom field)',
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		description: 'Employee first name',
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
			'Link to a Holiday List doctype record, used when computing leave',
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
			'Email of the user allowed to approve leave applications (HRMS custom field)',
	},
	{
		displayName: 'Middle Name',
		name: 'middle_name',
		type: 'string',
		default: '',
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
		description: 'Date the employee left. Frappe requires it to move the status to Left.',
	},
	{
		displayName: 'Reports To',
		name: 'reports_to',
		type: 'string',
		default: '',
		description: 'The "name" field of the reporting employee, e.g. HR-EMP-00002',
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
		description: 'Employment status',
	},
	{
		displayName: 'User ID',
		name: 'user_id',
		type: 'string',
		default: '',
		description: 'Email of the Frappe user account linked to the employee',
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
		description: 'Employee first name',
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
		description: 'Date the employee joined the company',
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
		'The Frappe record "name" field. For an employee it looks like HR-EMP-00001.',
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
