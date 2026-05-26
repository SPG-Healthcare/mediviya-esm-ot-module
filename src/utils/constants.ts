export const baseApiUrl = '/ws/rest/v1';

export const omrsDateFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZZ';

export enum SchedulingViewModes {
  CALENDAR = 'calendar',
  LIST = 'list',
}

export enum PeriodEnum {
  DAILY = 'daily',
  WEEKLY = 'weekly'
}

export enum SurgicalAppointmentStatusEnum {
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum FetchMethodEnum {
  GET = "GET",
  POST = "POST"
}

export enum SurgicalAppointmentInputTypeEnum {
  string = 'java.lang.String',
  number = 'java.lang.String',
  provider = 'org.openmrs.Provider',
}

export const otAdminRole = 'OT Admin'