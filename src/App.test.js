import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the portfolio home navigation', () => {
  render(<App />);
  expect(screen.getByRole('link', { name: 'Abbas home' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
});
