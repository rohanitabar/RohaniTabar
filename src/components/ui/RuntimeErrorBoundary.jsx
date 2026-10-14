/* eslint-disable react/prop-types */
import React from 'react';
import { reportClientIssue } from '../../lib/diagnostics';

export default class RuntimeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error, info) {
    reportClientIssue('interface', error?.message, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const fa = this.props.lang === 'fa';
    return <main className="runtime-error" role="alert"><h1>{fa ? 'یک مشکل پیش آمد' : 'Something went wrong'}</h1><p>{fa ? 'گزارش مشکل برای مدیر سایت فرستاده شد. صفحه را دوباره بارگذاری کن.' : 'The site administrator has been notified. Please reload the page.'}</p><button className="button button-primary" onClick={() => window.location.reload()}>{fa ? 'بارگذاری دوباره' : 'Reload page'}</button></main>;
  }
}
