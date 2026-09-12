import type { DeviceType, TransferStatus } from "./constants";

export interface TransferJobView {
  id: string;
  jobNo: number;
  agentId: string | null;
  agentName: string | null;
  employeeId: string | null;
  employeeName: string | null;
  deviceId: string | null;
  deviceName: string | null;
  deviceType: DeviceType | null;
  driveLetter: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerNotes: string | null;
  sourcePath: string;
  destinationPath: string;
  totalSize: number | null;
  transferredSize: number;
  currentSpeed: number | null;
  fileCount: number | null;
  transferredFiles: number;
  startTime: Date | null;
  endTime: Date | null;
  durationSeconds: number | null;
  averageSpeed: number | null;
  status: TransferStatus;
  errorMessage: string | null;
  percent: number;
  createdAt: Date;
}

export interface TransferDeviceView {
  id: string;
  agentId: string;
  deviceId: string;
  deviceName: string | null;
  deviceLabel: string | null;
  deviceType: DeviceType;
  driveLetter: string | null;
  filesystem: string | null;
  totalCapacity: number | null;
  freeSpace: number | null;
  serialNumber: string | null;
  connected: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export interface TransferAgentView {
  agentId: string;
  name: string;
  status: "ONLINE" | "OFFLINE";
  ipAddress: string | null;
  lastHeartbeat: Date | null;
  firstSeenAt: Date;
  nasShareId: string | null;
  shareLabel: string | null;
  serverHost: string | null;
  folders: string[];
}

export interface TransferFilters {
  search?: string;
  status?: TransferStatus;
  deviceType?: DeviceType;
  employeeId?: string;
  agentId?: string;
  deviceId?: string;
  customer?: string;
  dateFrom?: string;
  dateTo?: string;
  source?: string;
  limit?: number;
  offset?: number;
}
