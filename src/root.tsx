import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

// import SurgicalQueues from './pages/surgical-queues.page';
import OtSchedulingPage from './pages/ot-scheduling.page';
import SurgicalBlock from './pages/surgical-block.page';

import styles from './root.scss';

const Root: React.FC = () => {
  return (
    <main className={styles.container}>
      <BrowserRouter
        basename={`${window.spaBase}/home/operation-theater`}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* <Route path="/" element={<SurgicalQueues />} /> */}
          <Route path="/ot-scheduling" element={<OtSchedulingPage />} />
          <Route path="/surgical-block" element={<SurgicalBlock />} />
        </Routes>
      </BrowserRouter>
    </main>
  );
};

export default Root;
