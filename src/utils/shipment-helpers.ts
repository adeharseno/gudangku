import React from 'react';
import {
  Inbox as ReceivedIcon,
  Sort as SortingIcon,
  MoveToInbox as ReadyIcon,
  LocalShipping as DispatchedIcon,
  CheckCircle as DeliveredIcon,
  PauseCircle as OnHoldIcon,
  Cancel as CancelledIcon,
  FlagCircle as CriticalIcon,
  Warning as UrgentIcon,
  RadioButtonUnchecked as NormalIcon,
} from '@mui/icons-material';
import type { ShipmentStatus, Priority } from '@/api/types';
import { statusColors, priorityColors } from '@/theme/palette';

interface DisplayConfig {
  icon: React.ReactElement;
  label: string;
  color: string;
}

export const STATUS_CONFIG: Record<ShipmentStatus, DisplayConfig> = {
  received: { icon: React.createElement(ReceivedIcon), label: 'Received', color: statusColors.received },
  sorting: { icon: React.createElement(SortingIcon), label: 'Sorting', color: statusColors.sorting },
  ready_to_dispatch: { icon: React.createElement(ReadyIcon), label: 'Ready to Dispatch', color: statusColors.ready_to_dispatch },
  dispatched: { icon: React.createElement(DispatchedIcon), label: 'Dispatched', color: statusColors.dispatched },
  delivered: { icon: React.createElement(DeliveredIcon), label: 'Delivered', color: statusColors.delivered },
  on_hold: { icon: React.createElement(OnHoldIcon), label: 'On Hold', color: statusColors.on_hold },
  cancelled: { icon: React.createElement(CancelledIcon), label: 'Cancelled', color: statusColors.cancelled },
};

export const PRIORITY_CONFIG: Record<Priority, DisplayConfig> = {
  normal: { icon: React.createElement(NormalIcon), label: 'Normal', color: priorityColors.normal },
  urgent: { icon: React.createElement(UrgentIcon), label: 'Urgent', color: priorityColors.urgent },
  critical: { icon: React.createElement(CriticalIcon), label: 'Critical', color: priorityColors.critical },
};
