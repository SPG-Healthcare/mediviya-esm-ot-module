import React from 'react';
import { render, screen } from '@testing-library/react';
import { createLeftPanelLink, type DashboardLinkConfig } from './create-left-panel-link.component';

jest.mock('@openmrs/esm-framework', () => {
  const React = require('react');

  return {
    ConfigurableLink: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children),
  };
});

jest.mock('react-router-dom', () => {
  const React = require('react');

  return {
    BrowserRouter: ({ children }) => React.createElement(React.Fragment, null, children),
  };
});

const dashboardLinkConfig: DashboardLinkConfig = {
  name: 'operation-theater/ot-scheduling',
  title: 'Operation Theater',
  slot: 'ot-dashboard-slot',
};

describe('createLeftPanelLink', () => {
  beforeEach(() => {
    window.spaBase = '/openmrs/spa';
    window.history.pushState({}, '', '/openmrs/spa/home');
  });

  it('renders a left panel link with the configured title and dashboard route', () => {
    const LeftPanelLink = createLeftPanelLink(dashboardLinkConfig);

    render(<LeftPanelLink />);

    const link = screen.getByRole('link', { name: /operation theater/i });
    expect(link).toHaveAttribute('href', '/openmrs/spa/home/operation-theater/ot-scheduling');
    expect(link).toHaveClass('cds--side-nav__link');
  });

  it('marks the link as active when the current route matches the dashboard name', () => {
    window.history.pushState({}, '', '/openmrs/spa/home/operation-theater/ot-scheduling');
    const LeftPanelLink = createLeftPanelLink(dashboardLinkConfig);

    render(<LeftPanelLink />);

    expect(screen.getByRole('link', { name: /operation theater/i })).toHaveClass('active-left-nav-link');
  });

  it('does not mark the link as active when the current route does not match the dashboard name', () => {
    window.history.pushState({}, '', '/openmrs/spa/home/patient-chart');
    const LeftPanelLink = createLeftPanelLink(dashboardLinkConfig);

    render(<LeftPanelLink />);

    expect(screen.getByRole('link', { name: /operation theater/i })).not.toHaveClass('active-left-nav-link');
  });
});
