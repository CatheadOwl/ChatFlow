import React from 'react';
import FlowToolbar from './flow/FlowToolbar';
import FlowCore from './flow/FlowCore';
import SaveToast from './flow/SaveToast';
import LinearConversation from './LinearConversation';

export default function FlowCanvas({ showLinear = true }) {
  return (
    <div style={{ flex: 1, height: '100vh', display: 'flex' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <FlowToolbar />
        <div style={{ flex: 1, minHeight: 0 }}>
          <FlowCore />
        </div>
        <SaveToast />
      </div>
      {showLinear && <LinearConversation />}
    </div>
  );
}
