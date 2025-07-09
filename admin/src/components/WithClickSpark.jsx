import React from 'react';
import ClickSpark from './ClickSpark';

const WithClickSpark = ({
  children,
  sparkColor = "#FF69B4",
  sparkSize = 12,
  sparkRadius = 20,
  sparkCount = 10,
  duration = 500,
  easing = "ease-out",
  extraScale = 1.2,
  className = "",
}) => {
  return (
    <ClickSpark
      sparkColor={sparkColor}
      sparkSize={sparkSize}
      sparkRadius={sparkRadius}
      sparkCount={sparkCount}
      duration={duration}
      easing={easing}
      extraScale={extraScale}
    >
      <div className={className}>
        {children}
      </div>
    </ClickSpark>
  );
};

export default WithClickSpark; 