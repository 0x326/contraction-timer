let offset = 0;

export const setServerTimeOffset = (value: number) => {
  offset = value;
};

export const getServerTimeOffset = () => offset;

export const now = () => Date.now() + offset;
