import React from 'react';
import styled from 'styled-components';

const RotateButtonLoader = () => {
  return (
    <StyledWrapper>
      <div className="loader">
        <span
          style={{ '--delay': 1 } as React.CSSProperties}
          className="ball"
        />
        <span
          style={{ '--delay': 2 } as React.CSSProperties}
          className="ball"
        />
        <span
          style={{ '--delay': 3 } as React.CSSProperties}
          className="ball"
        />
        <span
          style={{ '--delay': 4 } as React.CSSProperties}
          className="ball"
        />
        <span
          style={{ '--delay': 5 } as React.CSSProperties}
          className="ball"
        />
        <span
          style={{ '--delay': 6 } as React.CSSProperties}
          className="ball"
        />
        <span
          style={{ '--delay': 8 } as React.CSSProperties}
          className="ball"
        />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .loader {
    width: 220px;
    height: 220px;
    border-radius: 50%;
    position: relative;
    border: solid 5px transparent;
    box-shadow:
      5px 5px 5px rgb(88, 87, 87),
      inset 5px 5px 5px rgb(85, 80, 80),
      inset -1px -1px 10px rgba(0, 0, 0, 0.432),
      -1px -1px 10px rgba(0, 0, 0, 0.281);
  }

  .loader::before {
    content: '';
    display: inline-block;
    position: absolute;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    box-shadow:
      5px 5px 20px black,
      -2px -2px 40px black;
    background: repeating-conic-gradient(rgb(61, 59, 59) 0%, rgb(248, 248, 246) 15%, rgb(54, 52, 52) 33.33%);
  }

  .ball {
    width: 15px;
    height: 15px;
    display: inline-block;
    background: radial-gradient(circle at 8px 5px, white 5%, rgba(54, 53, 53, 0.685));
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) translateX(97.5px);
    animation: rotate 5s calc(var(--delay) * 0.2s) infinite linear;
  }

  @keyframes rotate {
    0% {
      transform: translate(-50%, -50%) rotate(0deg) translateX(97.5px);
    }

    100% {
      transform: translate(-50%, -50%) rotate(360deg) translateX(97.5px);
    }
  }
`;

export default RotateButtonLoader;
