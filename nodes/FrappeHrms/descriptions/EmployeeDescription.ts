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
		displayName: 'Branch Name or ID',
		name: 'branch',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getBranches' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Cell Number',
		name: 'cell_number',
		type: 'string',
		default: '',
		description: 'Personal mobile number',
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
		displayName: 'Company Email',
		name: 'company_email',
		type: 'string',
		placeholder: 'name@company.com',
		default: '',
		description: 'Work e-mail address',
	},
	{
		displayName: 'Date of Birth',
		name: 'date_of_birth',
		type: 'dateTime',
		default: '',
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
		displayName: 'Default Shift Name or ID',
		name: 'default_shift',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getShiftTypes' },
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
		displayName: 'Designation Name or ID',
		name: 'designation',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getDesignations' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Employee Number',
		name: 'employee_number',
		type: 'string',
		default: '',
		description: 'Internal employee number, distinct from the "name" field Frappe generates',
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
		displayName: 'Expense Approver',
		name: 'expense_approver',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Email of the user allowed to approve expense claims (HRMS custom field)',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchUser',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'agent@example.com',
			},
		],
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		description: 'Employee first name',
	},
	{
		displayName: 'Gender Name or ID',
		name: 'gender',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getGenders' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Grade Name or ID',
		name: 'grade',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getEmployeeGrades' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Holiday List Name or ID',
		name: 'holiday_list',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getHolidayLists' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		default: '',
		description: 'Employee surname',
	},
	{
		displayName: 'Leave Approver',
		name: 'leave_approver',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Email of the user allowed to approve leave applications (HRMS custom field)',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchUser',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'agent@example.com',
			},
		],
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
		placeholder: 'name@example.com',
		default: '',
		description: 'Personal e-mail address',
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
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The "name" field of the reporting employee, e.g. HR-EMP-00002',
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
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Email of the Frappe user account linked to the employee',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchUser',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'agent@example.com',
			},
		],
	},
];

/**
 * `last_name` is required here although the doctype does not mark it `reqd`: `employee_name`,
 * the label every list and every link shows, is built from the name parts, and an employee
 * created with a first name alone is labelled by it — awkward to spot and tedious to fix once
 * documents reference the record. The constraint is the node's, not Frappe's, and Update
 * leaves it optional so an existing employee is never forced to gain a surname.
 */
/**
 * Fields exposed at the top level on create, outside the collection.
 *
 * The node imports this list to know which parameters to read there, so the fields
 * drawn here and the fields sent cannot drift apart.
 */
export const EMPLOYEE_REQUIRED_ON_CREATE = [
	'first_name',
	'last_name',
	'gender',
	'date_of_birth',
	'date_of_joining',
	'company',
];

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
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['employee'], operation: ['create'] } },
		description: 'Employee surname',
	},
	{
		displayName: 'Gender Name or ID',
		name: 'gender',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getGenders' },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['employee'], operation: ['create'] } },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Date of Birth',
		name: 'date_of_birth',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['employee'], operation: ['create'] } },
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
		displayName: 'Company Name or ID',
		name: 'company',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCompanies' },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['employee'], operation: ['create'] } },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	documentIdField(
		'employee',
		'The Frappe record "name" field. For an employee it looks like HR-EMP-00001.',
		undefined,
		'HR-EMP-00001',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['employee'], operation: ['create'] } },
		options: omitFields(employeeFields, EMPLOYEE_REQUIRED_ON_CREATE),
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
