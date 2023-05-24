import { useRef, useState, useEffect } from 'react'
import SizeAndPositionManager, { ItemSize } from './SizeAndPositionManager';
import {
  ALIGNMENT,
  DIRECTION,
  SCROLL_CHANGE_REASON,
  marginProp,
  oppositeMarginProp,
  positionProp,
  scrollProp,
  sizeProp,
} from './constants';

export type ItemPosition = 'absolute' | 'sticky';

export interface ItemStyle {
  position: ItemPosition;
  top?: number;
  left: number;
  width: string | number;
  height?: number;
  marginTop?: number;
  marginLeft?: number;
  marginRight?: number;
  marginBottom?: number;
  zIndex?: number;
}

export interface RenderedRows {
  startIndex: number;
  stopIndex: number;
}

export interface ItemInfo {
  index: number;
  style: ItemStyle;
}

export interface Props {
  className?: string;
  estimatedItemSize?: number;
  height: number | string;
  itemCount: number;
  itemSize: ItemSize;
  overscanCount?: number;
  scrollOffset?: number;
  scrollToIndex?: number;
  scrollToAlignment?: ALIGNMENT;
  scrollDirection?: DIRECTION;
  stickyIndices?: number[];
  style?: React.CSSProperties;
  width?: number | string;
  onItemsRendered?({ startIndex, stopIndex }: RenderedRows): void;
  onScroll?(offset: number, event: Event): void;
  renderItem(itemInfo: ItemInfo): React.ReactNode;
}

const VirtualList = (props: Props) => {
  // const { overscanCount = 3, scrollDirection = DIRECTION.VERTICAL, width = '100%' } = props;
  const [offset, setOffset] = useState(
    props.scrollOffset ||
    (props.scrollToIndex != null &&
      getOffsetForIndex(props.scrollToIndex)) ||
    0);
  const rootNode = useRef<HTMLDivElement>(null);
  const scrollChangeReason = useRef(SCROLL_CHANGE_REASON.REQUESTED);
  const styleCache = useRef({})
  const sizeAndPositionManager = useRef(new SizeAndPositionManager({
    itemCount: props.itemCount,
    itemSizeGetter: itemSizeGetter(props.itemSize),
    estimatedItemSize: getEstimatedItemSize(),
  }));

  useEffect(() => {
    const { scrollOffset, scrollToIndex } = props;
    if (scrollOffset != null) {
      _scrollTo(scrollOffset);
    } else if (scrollToIndex != null) {
      _scrollTo(getOffsetForIndex(scrollToIndex));
    }

    rootNode.current?.addEventListener('scroll', (e) => handleScroll(e), {
      passive: true,
    });
  }, [])

  function _scrollTo(value: number) {
    const { scrollDirection = DIRECTION.VERTICAL } = props;
    rootNode.current && (rootNode.current[scrollProp[scrollDirection]] = value);
  }

  function itemSizeGetter(itemSize: Props['itemSize']) {
    return (index: number) => getSize(index, itemSize);
  }

  function getEstimatedItemSize() {
    return (
      props.estimatedItemSize ||
      (typeof props.itemSize === 'number' && props.itemSize) ||
      50
    );
  }


  function getSize(index: number, itemSize: Props['itemSize']) {
    if (typeof itemSize === 'function') {
      return itemSize(index);
    }

    return Array.isArray(itemSize) ? itemSize[index] : itemSize;
  }

  function getOffsetForIndex(
    index: number,
    scrollToAlignment = props.scrollToAlignment,
    itemCount: number = props.itemCount,
  ): number {
    const { scrollDirection = DIRECTION.VERTICAL } = props;

    if (index < 0 || index >= itemCount) {
      index = 0;
    }

    return sizeAndPositionManager.current.getUpdatedOffsetForIndex({
      align: scrollToAlignment,
      containerSize: props[sizeProp[scrollDirection]],
      currentOffset: offset || 0,
      targetIndex: index,
    });
  }

  function handleScroll(event: Event) {
    const {onScroll} = props;
    const newOffset = getNodeOffset();

    if (
      offset < 0 ||
      offset === newOffset ||
      event.target !== rootNode.current
    ) {
      return;
    }

    setOffset(newOffset)
    scrollChangeReason.current =  SCROLL_CHANGE_REASON.OBSERVED;

    if (typeof onScroll === 'function') {
      onScroll(offset, event);
    }
  }

  function getNodeOffset() {
    const {scrollDirection = DIRECTION.VERTICAL} = props;

    return rootNode.current?.[scrollProp[scrollDirection]] || 0;
  }

  return (
    <div ref={rootNode}>
      123
      {/* <div style={innerStyle}>{items}</div> */}
    </div>
  )
}

export default VirtualList;