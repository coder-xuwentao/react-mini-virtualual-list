import { createRoot } from 'react-dom/client';

import VirtualList, {ItemStyle} from '../src/VariableSizeList';
import { DIRECTION } from '../src/constants';
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
    console.log('tao', _)
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
const root = createRoot(container!); // createRoot(container!) if you use TypeScript
root.render(<EXAMPLE />);
