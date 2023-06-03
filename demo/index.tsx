import { createRoot } from 'react-dom/client';

import  VirtualList, { DIRECTION } from '../src';
import type { ItemStyle } from '../src';
import './index.css';

const EXAMPLE = () => {
  const renderItem = ({style, index}: {style: ItemStyle; index: number}) => {
    return (
      <div className="Row" style={style} key={index}>
        Row #{index}
      </div>
    );
  };

  const getItemSize = (_: number) => {
    return (Math.random() * 50) + 50
  }
  
  return (
    <div className="Root">
      <VirtualList
        width={800}
        height={400}
        itemCount={100}
        renderItem={renderItem}
        itemSize={getItemSize}
        className="VirtualList"
        estimatedItemSize={50}
        scrollDirection={DIRECTION.VERTICAL}
      />
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<EXAMPLE />);
