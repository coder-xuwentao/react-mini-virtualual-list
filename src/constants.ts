export enum ALIGNMENT {
  AUTO = 'auto',
  START = 'start',
  CENTER = 'center',
  END = 'end',
}

export enum DIRECTION {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}

export enum SCROLL_CHANGE_REASON {
  OBSERVED = 'observed',
  REQUESTED = 'requested',
}

export const scrollProp = {
  [DIRECTION.VERTICAL]: 'scrollTop',
  [DIRECTION.HORIZONTAL]: 'scrollLeft',
} as const;

export const sizeProp = {
  [DIRECTION.VERTICAL]: 'height',
  [DIRECTION.HORIZONTAL]: 'width',
} as const;

export const positionProp = {
  [DIRECTION.VERTICAL]: 'top',
  [DIRECTION.HORIZONTAL]: 'left',
};
