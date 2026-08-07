import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

const STATUS_OPTIONS = [
	{ name: 'Absent', value: 'Absent' },
	{ name: 'Half Day', value: 'Half Day' },
	{ name: 'On Leave', value: 'On Leave' },
	{ name: 'Present', value: 'Present' },
	{ name: 'Work From Home', value: 'Work From Home' },
];

/** `Attendance` fields offered on create as well as update. */
const attendanceFields: INodeProperties[] = [
	{
		displayName: 'Attendance Date',
		name: 'attendance_date',
		type: 'dateTime',
		default: '',
		description: 'Day the attendance record covers',
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
		displayName: 'Early Exit',
		name: 'early_exit',
		type: 'boolean',
		default: false,
		description: 'Whether the employee left before the end of the shift',
	},
	{
		displayName: 'Employee',
		name: 'employee',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The "name" field of the employee, e.g. HR-EMP-00001',
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
		displayName: 'Half Day Status',
		name: 'half_day_status',
		type: 'options',
		options: [
			{ name: 'Absent', value: 'Absent' },
			{ name: 'Present', value: 'Present' },
		],
		default: 'Present',
		description: 'Which half of the day, used when the status is Half Day',
	},
	{
		displayName: 'In Time',
		name: 'in_time',
		type: 'dateTime',
		default: '',
		description: 'Check-in timestamp',
	},
	{
		displayName: 'Late Entry',
		name: 'late_entry',
		type: 'boolean',
		default: false,
		description: 'Whether the employee arrived after the start of the shift',
	},
	{
		displayName: 'Leave Application',
		name: 'leave_application',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description:
			'The "name" field of the leave application behind this attendance record, e.g. HR-LAP-2026-00001',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchLeaveApplication',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'HR-LAP-2026-00001',
			},
		],
	},
	{
		displayName: 'Leave Type Name or ID',
		name: 'leave_type',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getLeaveTypes' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Out Time',
		name: 'out_time',
		type: 'dateTime',
		default: '',
		description: 'Check-out timestamp',
	},
	{
		displayName: 'Shift Name or ID',
		name: 'shift',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getShiftTypes' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: STATUS_OPTIONS,
		default: 'Present',
		description: 'Attendance status',
	},
	{
		displayName: 'Working Hours',
		name: 'working_hours',
		type: 'number',
		default: 0,
		description: 'Number of hours worked',
	},
];

/**
 * Fields exposed at the top level on create, outside the collection.
 *
 * The node imports this list to know which parameters to read there, so the fields
 * drawn here and the fields sent cannot drift apart.
 */
export const ATTENDANCE_REQUIRED_ON_CREATE = ['employee', 'attendance_date', 'status'];

export const attendanceDescription: INodeProperties[] = [
	operationsFor('attendance', 'attendance record'),
	{
		displayName: 'Employee',
		name: 'employee',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: { resource: ['attendance'], operation: ['create'] } },
		description: 'The "name" field of the employee, e.g. HR-EMP-00001',
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
		displayName: 'Attendance Date',
		name: 'attendance_date',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['attendance'], operation: ['create'] } },
		description: 'Day the attendance record covers',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: STATUS_OPTIONS,
		default: 'Present',
		required: true,
		displayOptions: { show: { resource: ['attendance'], operation: ['create'] } },
		description: 'Attendance status',
	},
	documentIdField(
		'attendance',
		'The Frappe record "name" field. For an attendance record it looks like HR-ATT-2026-00001.',
		undefined,
		'HR-ATT-2026-00001',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['attendance'], operation: ['create'] } },
		options: omitFields(attendanceFields, ATTENDANCE_REQUIRED_ON_CREATE),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['attendance'], operation: ['update'] } },
		options: attendanceFields,
	},
	...getManyFields('attendance'),
];
