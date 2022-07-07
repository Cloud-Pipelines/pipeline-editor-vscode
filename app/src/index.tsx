import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
//import App from './App';
//import PipelineEditorApp from 'pipeline-editor/src/App';
import PipelineEditorAppVSCode from './AppVSCode';

ReactDOM.render(
  <React.StrictMode>
    {/* Works */}
    {/* <App /> */}
    {/* Works */}
    {/* <PipelineEditorApp /> */}
    {/* Works */}
    <PipelineEditorAppVSCode />
  </React.StrictMode>,
  document.getElementById('root')
);
