/**
 * @license
 * Copyright 2021 Alexey Volkov
 * SPDX-License-Identifier: Apache-2.0
 * @author         Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 * @copyright 2021 Alexey Volkov <alexey.volkov+oss@ark-kun.com>
 */

import './pipeline-editor/src/App.css';
import DnDFlow from './DnDFlowVSCode';

function App() {
  return (
    <div className="App" style={{ width: "100%", height: "calc(100% - 30px)" }}>
      <DnDFlow />
    </div>
  );
}

export default App;
