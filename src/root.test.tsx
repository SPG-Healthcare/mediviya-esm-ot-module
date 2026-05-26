/**
 * This is the root test for this page. It simply checks that the page
 * renders. If the components of your page are highly interdependent,
 * (e.g., if the `Root` component had state that communicated
 * information between `Greeter` and `PatientGetter`) then you might
 * want to do most of your testing here. If those components are
 * instead quite independent (as is the case in this example), then
 * it would make more sense to test those components independently.
 *
 * The key thing to remember, always, is: write tests that behave like
 * users. They should *look* for elements by their visual
 * characteristics, *interact* with them, and (mostly) *assert* based
 * on things that would be visually apparent to a user.
 *
 * To learn more about how we do testing, see the following resources:
 *   https://o3-docs.vercel.app/docs/frontend-modules/testing
 *   https://kentcdodds.com/blog/how-to-know-what-to-test
 *   https://kentcdodds.com/blog/testing-implementation-details
 *   https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
 *
 * Kent C. Dodds is the inventor of `@testing-library`:
 *   https://testing-library.com/docs/guiding-principles
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import Root from './root';

jest.mock('./pages/ot-scheduling.page', () => {
  const React = require('react');

  return () => React.createElement('div', null, 'OT scheduling page');
});

jest.mock('./pages/surgical-block.page', () => {
  const React = require('react');

  return () => React.createElement('div', null, 'Surgical block page');
});

it('renders the operation theater root', () => {
  window.spaBase = '/openmrs/spa';
  window.history.pushState({}, '', '/openmrs/spa/home/operation-theater/ot-scheduling');

  render(<Root />);

  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByText('OT scheduling page')).toBeInTheDocument();
});
