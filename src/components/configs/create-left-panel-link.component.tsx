import React, { useMemo } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfigurableLink } from '@openmrs/esm-framework';

export interface DashboardLinkConfig {
  name: string;
  title: string;
  slot?: string;
}

function DashboardExtension({ name, title, slot }: DashboardLinkConfig) {
  const { t } = useTranslation();
  const spaBasePath = `${window.spaBase}/home`;

  const navLink = useMemo(() => {
    const pathArray = location.pathname.split('/home');
    const lastElement = pathArray[pathArray.length - 1];
    return decodeURIComponent(lastElement);
  }, [location.pathname]);

  return (
    <ConfigurableLink
      to={`${spaBasePath}/${name}`}
      className={`cds--side-nav__link ${navLink.match(name) && 'active-left-nav-link'}`}
    >
      {t(title)}
    </ConfigurableLink>
  );
}

export const createLeftPanelLink = (config: DashboardLinkConfig) => () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <DashboardExtension {...config} />
  </BrowserRouter>
);
