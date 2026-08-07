/**
 * Mapping from n8n resource to Frappe doctype.
 *
 * Names verified against github.com/frappe/hrms (branch `develop`):
 * `hrms/hr/doctype/` for the HR doctypes, `hrms/payroll/doctype/` for Salary Slip.
 *
 * Careful with `Employee`: it is **not** owned by HRMS. It lives in ERPNext
 * (`erpnext/setup/doctype/employee`) and HRMS only extends it — `hrms/hooks.py` declares
 * `required_apps = ["frappe/erpnext"]`, an `override_doctype_class` on Employee, and adds
 * custom fields (`employment_type`, `grade`, `leave_approver`, `expense_approver`,
 * `default_shift`, …) through `hrms/setup.py`. The REST path stays `/api/resource/Employee`,
 * but a site running ERPNext without HRMS will not have those custom fields.
 */
export const DOCTYPE_BY_RESOURCE = {
	employee: 'Employee',
	leaveApplication: 'Leave Application',
	attendance: 'Attendance',
	expenseClaim: 'Expense Claim',
	salarySlip: 'Salary Slip',
	jobOpening: 'Job Opening',
	jobApplicant: 'Job Applicant',
	jobOffer: 'Job Offer',
} as const;

export type FrappeHrmsResource = keyof typeof DOCTYPE_BY_RESOURCE;

export function getDoctype(resource: string): string {
	const doctype = DOCTYPE_BY_RESOURCE[resource as FrappeHrmsResource];
	if (doctype === undefined) {
		throw new Error(`Unknown resource: ${resource}`);
	}
	return doctype;
}
