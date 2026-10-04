import React from 'react';
import { createPortal } from 'react-dom';

// Renders full-screen overlays straight into <body> so `position: fixed` always means "the whole
// viewport", even when the screen that opens them sits inside a transformed or animated wrapper.
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => createPortal(children, document.body);

export default Portal;
