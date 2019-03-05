// eslint-disable-next-line no-underscore-dangle
const __mocks = {
  before: jest.fn(),
  after: jest.fn(),
  onError: jest.fn(),
};

const middyware = () => ({
  before: (handler, next) => {
    __mocks.before(handler);
    return next();
  },
  after: (handler, next) => {
    __mocks.after(handler);
    return next();
  },
  onError: (handler, next) => {
    __mocks.onError(handler);
    return next();
  },
});

module.exports = {
  __mocks,
  middyware,
};
