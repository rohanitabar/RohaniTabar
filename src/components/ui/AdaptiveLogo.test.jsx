import { fireEvent, render } from '@testing-library/react';
import AdaptiveLogo from './AdaptiveLogo';

const initialTheme = document.documentElement.dataset.theme;

afterEach(() => {
  jest.restoreAllMocks();
  if (initialTheme === undefined) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = initialTheme;
});

test('uses the displayed image for color analysis in dark mode', () => {
  const drawImage = jest.fn();
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
    getImageData: () => ({ data: [0, 0, 0, 255] }),
  });
  const probe = jest.spyOn(window, 'Image');

  document.documentElement.dataset.theme = 'light';
  const light = render(<AdaptiveLogo src="/light-icon.svg" alt="Light preview" />);
  fireEvent.load(light.getByRole('img'));
  expect(drawImage).not.toHaveBeenCalled();
  light.unmount();

  document.documentElement.dataset.theme = 'dark';
  const dark = render(<AdaptiveLogo src="/dark-icon.svg" alt="Dark preview" />);
  const image = dark.getByRole('img');
  fireEvent.load(image);
  expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 32, 32);
  expect(image.parentElement).toHaveClass('has-light-backing');
  expect(probe).not.toHaveBeenCalled();
});

test('falls back to a CORS probe when the displayed image cannot be inspected', () => {
  const getImageData = jest.fn()
    .mockImplementationOnce(() => { throw new DOMException('Tainted canvas', 'SecurityError'); })
    .mockReturnValue({ data: [255, 255, 255, 255] });
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: jest.fn(), getImageData });
  const probe = {};
  jest.spyOn(window, 'Image').mockImplementation(() => probe);
  document.documentElement.dataset.theme = 'dark';

  const { getByRole } = render(<AdaptiveLogo src="https://example.com/external-icon.png" alt="External icon" />);
  const image = getByRole('img');
  fireEvent.load(image);
  expect(probe.crossOrigin).toBe('anonymous');
  expect(probe.src).toBe(image.src);
});

test('lets the browser schedule a lazy logo from the initial markup', () => {
  const originalObserver = window.IntersectionObserver;
  const observeLogo = jest.fn();
  window.IntersectionObserver = observeLogo;
  try {
    const { getByRole } = render(<AdaptiveLogo src="https://example.com/footer.png" alt="Footer icon" loading="lazy" />);
    const image = getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/footer.png');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(observeLogo).not.toHaveBeenCalled();
  } finally {
    window.IntersectionObserver = originalObserver;
  }
});

test('uses compact same-origin stock logos while retaining custom icon URLs', () => {
  const stock = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/LinkedIn_icon.svg/1280px-LinkedIn_icon.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail';
  const custom = 'https://example.com/custom-linkedin.png';
  const { getByRole, rerender } = render(<AdaptiveLogo src={stock} alt="LinkedIn" />);
  expect(getByRole('img')).toHaveAttribute('src', '/icons/social-linkedin.webp');
  rerender(<AdaptiveLogo src={custom} alt="LinkedIn" />);
  expect(getByRole('img')).toHaveAttribute('src', custom);
});

test('renders the dark footer logo with its backing from the first render', () => {
  document.documentElement.dataset.theme = 'dark';
  const { getByRole } = render(<AdaptiveLogo src="https://cdn.simpleicons.org/github/181717" alt="GitHub" />);
  const image = getByRole('img');
  expect(image).toHaveAttribute('src', '/icons/social-github.webp');
  expect(image.parentElement).toHaveClass('has-light-backing');
});
