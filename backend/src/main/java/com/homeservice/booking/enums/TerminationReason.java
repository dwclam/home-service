package com.homeservice.booking.enums;

public enum TerminationReason {
    CUSTOMER_CANCEL,
    PROVIDER_REJECT,
    PROVIDER_CANCEL,
    PROVIDER_UNABLE_TO_CONTINUE,
    PROVIDER_RESPONSE_TIMEOUT,
    DEPOSIT_TIMEOUT,
    SYSTEM_CANCEL
}
