import React from 'react';
import { StaticRouter } from 'react-router';
import { renderToString } from 'react-dom/server';
import Portfolio from './Portfolio';

export default function renderPortfolio({ location, ...props }) {
  return renderToString(<StaticRouter location={location}><Portfolio {...props} /></StaticRouter>);
}
