import React from 'react';
import styled from 'styled-components';

const WhiteWaveLoader = () => {
  return (
    <StyledWrapper>
      <div className="wrapper">
        <div className="container">
          <div className="wave">
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
          </div>
          <div
            data-level={1}
            className="wave">
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
          </div>
          <div
            data-level={2}
            className="wave">
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
          </div>
          <div
            data-level={3}
            className="wave">
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .container {
    padding: 0;
    margin: 0 auto;
    box-sizing: border-box;
    position: relative;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    overflow: hidden;
  }

  .wave {
    padding: 0;
    margin: 0 auto;
    box-sizing: border-box;
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-end;
  }
  .wave:nth-child(1) .bar {
    padding: 0;
    margin: 0 auto;
    box-sizing: border-box;
    width: 2px;
    height: 220px;
    background-color: #ccc;
  }
  .wave:nth-child(n + 2) .bar {
    padding: 0;
    margin: 0 auto;
    box-sizing: border-box;
    -webkit-animation:
      barHeight 3.9s infinite ease-in-out alternate,
      barSkew 3.9s infinite ease-in-out alternate;
    animation:
      barHeight 3.9s infinite ease-in-out alternate,
      barSkew 3.9s infinite ease-in-out alternate;
  }
  .wave .bar:nth-child(1) {
    -webkit-animation-delay: calc(var(--f) * 0), calc(var(--f) * 0 - 1.95s);
    animation-delay: calc(var(--f) * 0), calc(var(--f) * 0 - 1.95s);
  }
  .wave .bar:nth-child(2) {
    -webkit-animation-delay: calc(var(--f) * 1), calc(var(--f) * 1 - 1.95s);
    animation-delay: calc(var(--f) * 1), calc(var(--f) * 1 - 1.95s);
  }
  .wave .bar:nth-child(3) {
    -webkit-animation-delay: calc(var(--f) * 2), calc(var(--f) * 2 - 1.95s);
    animation-delay: calc(var(--f) * 2), calc(var(--f) * 2 - 1.95s);
  }
  .wave .bar:nth-child(4) {
    -webkit-animation-delay: calc(var(--f) * 3), calc(var(--f) * 3 - 1.95s);
    animation-delay: calc(var(--f) * 3), calc(var(--f) * 3 - 1.95s);
  }
  .wave .bar:nth-child(5) {
    -webkit-animation-delay: calc(var(--f) * 4), calc(var(--f) * 4 - 1.95s);
    animation-delay: calc(var(--f) * 4), calc(var(--f) * 4 - 1.95s);
  }
  .wave .bar:nth-child(6) {
    -webkit-animation-delay: calc(var(--f) * 5), calc(var(--f) * 5 - 1.95s);
    animation-delay: calc(var(--f) * 5), calc(var(--f) * 5 - 1.95s);
  }
  .wave .bar:nth-child(7) {
    -webkit-animation-delay: calc(var(--f) * 6), calc(var(--f) * 6 - 1.95s);
    animation-delay: calc(var(--f) * 6), calc(var(--f) * 6 - 1.95s);
  }
  .wave .bar:nth-child(8) {
    -webkit-animation-delay: calc(var(--f) * 7), calc(var(--f) * 7 - 1.95s);
    animation-delay: calc(var(--f) * 7), calc(var(--f) * 7 - 1.95s);
  }
  .wave .bar:nth-child(9) {
    -webkit-animation-delay: calc(var(--f) * 8), calc(var(--f) * 8 - 1.95s);
    animation-delay: calc(var(--f) * 8), calc(var(--f) * 8 - 1.95s);
  }
  .wave .bar:nth-child(10) {
    -webkit-animation-delay: calc(var(--f) * 9), calc(var(--f) * 9 - 1.95s);
    animation-delay: calc(var(--f) * 9), calc(var(--f) * 9 - 1.95s);
  }
  .wave .bar:nth-child(11) {
    -webkit-animation-delay: calc(var(--f) * 10), calc(var(--f) * 10 - 1.95s);
    animation-delay: calc(var(--f) * 10), calc(var(--f) * 10 - 1.95s);
  }
  .wave .bar:nth-child(12) {
    -webkit-animation-delay: calc(var(--f) * 11), calc(var(--f) * 11 - 1.95s);
    animation-delay: calc(var(--f) * 11), calc(var(--f) * 11 - 1.95s);
  }
  .wave .bar:nth-child(13) {
    -webkit-animation-delay: calc(var(--f) * 12), calc(var(--f) * 12 - 1.95s);
    animation-delay: calc(var(--f) * 12), calc(var(--f) * 12 - 1.95s);
  }
  .wave .bar:nth-child(14) {
    -webkit-animation-delay: calc(var(--f) * 13), calc(var(--f) * 13 - 1.95s);
    animation-delay: calc(var(--f) * 13), calc(var(--f) * 13 - 1.95s);
  }
  .wave .bar:nth-child(15) {
    -webkit-animation-delay: calc(var(--f) * 14), calc(var(--f) * 14 - 1.95s);
    animation-delay: calc(var(--f) * 14), calc(var(--f) * 14 - 1.95s);
  }
  .wave .bar:nth-child(16) {
    -webkit-animation-delay: calc(var(--f) * 15), calc(var(--f) * 15 - 1.95s);
    animation-delay: calc(var(--f) * 15), calc(var(--f) * 15 - 1.95s);
  }
  .wave .bar:nth-child(17) {
    -webkit-animation-delay: calc(var(--f) * 16), calc(var(--f) * 16 - 1.95s);
    animation-delay: calc(var(--f) * 16), calc(var(--f) * 16 - 1.95s);
  }
  .wave .bar:nth-child(18) {
    -webkit-animation-delay: calc(var(--f) * 17), calc(var(--f) * 17 - 1.95s);
    animation-delay: calc(var(--f) * 17), calc(var(--f) * 17 - 1.95s);
  }
  .wave .bar:nth-child(19) {
    -webkit-animation-delay: calc(var(--f) * 18), calc(var(--f) * 18 - 1.95s);
    animation-delay: calc(var(--f) * 18), calc(var(--f) * 18 - 1.95s);
  }
  .wave .bar:nth-child(20) {
    -webkit-animation-delay: calc(var(--f) * 19), calc(var(--f) * 19 - 1.95s);
    animation-delay: calc(var(--f) * 19), calc(var(--f) * 19 - 1.95s);
  }
  .wave .bar:nth-child(21) {
    -webkit-animation-delay: calc(var(--f) * 20), calc(var(--f) * 20 - 1.95s);
    animation-delay: calc(var(--f) * 20), calc(var(--f) * 20 - 1.95s);
  }
  .wave .bar:nth-child(22) {
    -webkit-animation-delay: calc(var(--f) * 21), calc(var(--f) * 21 - 1.95s);
    animation-delay: calc(var(--f) * 21), calc(var(--f) * 21 - 1.95s);
  }
  .wave .bar:nth-child(23) {
    -webkit-animation-delay: calc(var(--f) * 22), calc(var(--f) * 22 - 1.95s);
    animation-delay: calc(var(--f) * 22), calc(var(--f) * 22 - 1.95s);
  }
  .wave .bar:nth-child(24) {
    -webkit-animation-delay: calc(var(--f) * 23), calc(var(--f) * 23 - 1.95s);
    animation-delay: calc(var(--f) * 23), calc(var(--f) * 23 - 1.95s);
  }
  .wave[data-level='1'] .bar {
    width: 11px;
    background-color: #fff;
    --f: -0.24375s;
    --h: 40px;
  }
  .wave[data-level='2'] .bar {
    width: 8px;
    background-color: #eee;
    --f: -0.4875s;
    --h: 100px;
  }
  .wave[data-level='3'] .bar {
    width: 5px;
    background-color: #ddd;
    --f: -0.325s;
    --h: 120px;
  }

  @-webkit-keyframes barHeight {
    from {
      height: var(--h);
    }
    to {
      height: calc(var(--h) + 50px);
    }
  }

  @keyframes barHeight {
    from {
      height: var(--h);
    }
    to {
      height: calc(var(--h) + 50px);
    }
  }
  @-webkit-keyframes barSkew {
    from {
      transform: skewY(30deg);
    }
    to {
      transform: skewY(-30deg);
    }
  }
  @keyframes barSkew {
    from {
      transform: skewY(30deg);
    }
    to {
      transform: skewY(-30deg);
    }
  }
`;

export default WhiteWaveLoader;
