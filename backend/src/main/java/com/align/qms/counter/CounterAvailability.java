package com.align.qms.counter;

/**
 * Real-time availability state of a Counter (BR-003).
 * <ul>
 *   <li>ONLINE   — ready to serve; can call next token</li>
 *   <li>ON_BREAK — staff on scheduled break; cannot call next</li>
 *   <li>AWAY     — staff temporarily unavailable; cannot call next</li>
 *   <li>OFFLINE  — counter closed; cannot call next</li>
 * </ul>
 */
public enum CounterAvailability {
    ONLINE,
    ON_BREAK,
    AWAY,
    OFFLINE
}
