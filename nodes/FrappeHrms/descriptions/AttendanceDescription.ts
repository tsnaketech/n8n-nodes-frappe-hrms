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
		description: 'Jour couvert par le pointage',
	},
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		description:
			"Lien vers un enregistrement du doctype Company. Frappe le déduit de l'employé lorsqu'il est laissé vide.",
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
		type: 'string',
		default: '',
		description: 'Champ « name » de l\'employé, par ex. HR-EMP-00001.',
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
		description: 'Sens de la demi-journée, utilisé lorsque le statut vaut Half Day',
	},
	{
		displayName: 'In Time',
		name: 'in_time',
		type: 'dateTime',
		default: '',
		description: "Horodatage d'arrivée",
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
		type: 'string',
		default: '',
		description: 'Champ « name » de la demande de congé à l\'origine du pointage, par ex. HR-LAP-2026-00001.',
	},
	{
		displayName: 'Leave Type',
		name: 'leave_type',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Leave Type, si le statut vaut On Leave',
	},
	{
		displayName: 'Out Time',
		name: 'out_time',
		type: 'dateTime',
		default: '',
		description: 'Horodatage de départ',
	},
	{
		displayName: 'Shift',
		name: 'shift',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Shift Type',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: STATUS_OPTIONS,
		default: 'Present',
		description: 'Statut de présence',
	},
	{
		displayName: 'Working Hours',
		name: 'working_hours',
		type: 'number',
		default: 0,
		description: 'Nombre d\'heures travaillées',
	},
];

const REQUIRED_ON_CREATE = ['employee', 'attendance_date', 'status'];

export const attendanceDescription: INodeProperties[] = [
	operationsFor('attendance', 'attendance record'),
	{
		displayName: 'Employee',
		name: 'employee',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['attendance'], operation: ['create'] } },
		description: 'Champ « name » de l\'employé, par ex. HR-EMP-00001.',
	},
	{
		displayName: 'Attendance Date',
		name: 'attendance_date',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['attendance'], operation: ['create'] } },
		description: 'Jour couvert par le pointage',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: STATUS_OPTIONS,
		default: 'Present',
		required: true,
		displayOptions: { show: { resource: ['attendance'], operation: ['create'] } },
		description: 'Statut de présence',
	},
	documentIdField(
		'attendance',
		'Champ « name » de l\'enregistrement Frappe. Pour un pointage il ressemble à HR-ATT-2026-00001.',
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['attendance'], operation: ['create'] } },
		options: omitFields(attendanceFields, REQUIRED_ON_CREATE),
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
