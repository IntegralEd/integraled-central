import styled from 'styled-components';
import { Box, Container, responsive } from 'styled-minimal';
import { UserState } from 'types';

export const StyledBox = styled(Box)<Pick<UserState, 'coach'>>`
  background-size: cover;
  background-position: center;
  background-image: url('${process.env.PUBLIC_URL}/media/images/background.png');
  // background: #c6123f;
  height: calc(100vh);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
`;

export const StyledContainer = styled(Container)<Pick<UserState, 'coach'>>`
  display: flex;
  flex-direction: column;

  background-color: #ececec;
  border-radius: 16px;
  height: 75%;
  max-width: 800px;
  padding: 0px;
  margin: 0px;

  & > .container {
    width: calc(100% - 4px);
    height: calc(100% - 100px);
    padding-right: 4px;
    flex: 1;
  }
  & > .container > ul {
    & > li {
      list-style-type: none;
    }
  }

  & > .container > ul {
    height: calc(100% - 40px);
    padding-right: 30px;
    padding-top: 20px;
    overflow-x: hidden;
    overflow-y: auto;
    padding-left: 20px;

    ::-webkit-scrollbar {
      width: 16px;
      height: 90%;
    }
    ::-webkit-scrollbar-thumb {
      border-radius: 10px;
      background-color: #9da5ab;
    }
    ::-webkit-scrollbar-track {
      border-radius: 10px;
      background-color: #303e483e;
    }
  }

  & > .container > ul > li {
    margin-bottom: 20px;
    padding: 0 20px;
    position: relative;
    border-radius: 10px;
    font: 0.9em / 1.6 'Lato';
    max-width: 80%;
    min-height: 50px;
    display: flex;
    gap: 10px;
    align-items: center;

    & > button {
      color: black;
      /* position: absolute;
      bottom: 10px;
      right: 10px; */
    }

    ${responsive({
      md: { font: "1em / 1.8 'Lato'" },
    })};
    // color: rgba(255, 255, 255, 0.9);
    color: black;
    background: white;
    // text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.75);
    clear: both;
  }
  & > .container > ul > li.words {
    width: 85%;
    border-radius: 0;
    border: 2px solid #211651;
    border-top: 24px solid #211651;
    // background-repeat: no-repeat;
    // background-size: 42px;
    // background-position: 6px;
    // background-position-y: -20px;
    background-color: rgba(247, 245, 234, 100);
    text-align: center;
    padding: 10px;
    margin-left: 15%;
    margin-right: auto;
    color: black;
    font-weight: 700;
    justify-content: center;
  }
  & > .container > ul > li.words:before {
    background-image: url('${process.env.PUBLIC_URL}/media/images/reading.png');
    left: -48px;
    top: -36px;
    width: 70px;
    height: 70px;
    background-size: cover;
    backround-position: center;
  }
  & > .container > ul > li.words:after {
    background-image: url('${process.env.PUBLIC_URL}/media/images/text.png');
    left: 36px;
    top: -32px;
    width: 287px;
    height: 33px;
  }
  & > .container > ul > li.odd {
    float: left;
    // padding-right: 0px;
    margin-left: 20px;
    /* ${responsive({
      md: { marginLeft: '80px' },
    })}; */
  }
  & > .container > ul > li.even {
    float: right;
    // margin-right: 20px;
    /* ${responsive({
      md: { marginRight: '80px' },
    })}; */
    // background: linear-gradient(to right, #4c5094, #6d71ba);
    background: #c8d7da;
    color: black;
  }
  & > .container > ul > li:before,
  & > .container > ul > li:after {
    position: absolute;
    content: '';
  }
  /*&> .container > ul > li:before {
    width: 60px;
    height: 60px;
    top: -6px;
    border-radius: 50%;
    background-position: 50% 50%;
    background-repeat: no-repeat;
    background-size: cover;
    backround-position: center;
    display: none;
    ${responsive({
    md: { display: 'block' },
  })};
  }*/
  & > .container > ul > li.odd:before {
    content: '';
    position: absolute;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 10px 16px 10px 0;
    border-color: transparent #fff transparent transparent;
    z-index: 0;
    left: -12px;
    top: 20%;
  }

  & > .container > ul > li.even:before {
    content: '';
    position: absolute;
    width: 0;
    height: 0;
    border-style: solid;
    z-index: 0;
    border-width: 10px 0 10px 16px;
    border-color: transparent transparent transparent #c8d7da;
    left: auto;
    right: -12px;
    top: 60%;
    /* right: -80px;
    background-image: url('${process.env.PUBLIC_URL}/media/images/avatar.png');
    border: 3px solid #4c5094; */
  }

  // ul>li:after {
  //   width: 0;
  //   height: 0;
  //   top: 15px;
  //   border-top: 15px solid rgba(255, 255, 255, 0.65);
  // }
  // ul>li:nth-child(odd):after {
  //   left: -15px;
  //   border-left: 15px solid transparent;
  // }
  // ul>li:nth-child(even):after {
  //   right: -15px;
  //   border-top-color: rgba(255, 255, 255, 0.3);
  //   border-right: 15px solid transparent;
  // }
`;

export const Input = styled.textarea`
  border: none;
  background-image: none;
  background-color: white;
  padding: 0.5rem 1rem;
  border-radius: 1.125rem;
  flex-grow: 1;
  box-shadow: 0 0 1rem rgba(0, 0, 0, 0.1), 0rem 1rem 1rem -1rem rgba(0, 0, 0, 0.2);
  letter-spacing: 0.025em;
  font: 0.9em 'Lato';
  line-height: 1.6;
  margin: 20px;
  margin-right: 0;

  ${responsive({
    md: { fontSize: '1em' },
  })};
  outline: 2px solid grey;
`;

export const Button = styled.button`
  width: 60px;
  height: 60px;
  margin: 20px;
  background-size: cover;
  background-position: center;
  background-image: url('${process.env.PUBLIC_URL}/media/images/send.png');

  &:hover {
    background-image: url('${process.env.PUBLIC_URL}/media/images/send_pressed.png');
  }

  &:active {
    background-image: url('${process.env.PUBLIC_URL}/media/images/send.png');
  }
`;

export const InputBox = styled(Box)`
  display: flex;
  justify-content: center;
  background: white;
  border-radius: 0 0 20px 20px;
  height: 100px;
  
  .spinner-container {
    flex-grow: 1;
    position: relative;
    margin: 20px;
  }

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border-left-color: #007bff;
    animation: spin 1s infinite linear;
    position: absolute;
    left: calc(50% - 25px);
    top: calc(50% - 25px);
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
}
`;

export const Record = styled.button`
  width: 60px;
  height: 60px;
  margin: 20px;
  margin-right: 0;
  background-size: cover;
  background-position: center;
  background-image: url('${process.env.PUBLIC_URL}/media/images/record.png');

  &.checked {
    background-image: url('${process.env.PUBLIC_URL}/media/images/record_pressed.png');
  }
`;

/* const Actions = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
`;

const Action = styled.button`
  align-items: center;
  color: black;
  display: flex;
  font-size: 2rem;
  padding: 16px;

  ${responsive({ md: { fontSize: '1.9rem' } })};

  &.active {
    color: #fff;
  }
  span {
    display: inline-block;
    margin-right: 0.4rem;
    text-transform: none;
  }

  .icon {
    border-radius: 50px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: white;
    margin-right: 8px;
    border: 3px solid transparent;
    color: #c6123f;
  }

  &:hover .icon {
    background-color: lightgrey;
  }

  &:active .icon {
    color: white;
    background-color: #c6123f;
  }
`; */

/* const Listen = styled(Action)`
  .icon.checked {
    background-color: #7aa558;
    color: white;
  }

  &:hover .checked {
    background-color: #7aa55888;
  }

  &:active .checked {
    background-color: #c6123f;
  }
`;

const Record = styled(Action)`
  .icon.checked {
    background-color: #b8357b;
    color: white;
  }
  &:hover .checked {
    background-color: #b8357b88;
  }
  &:active .checked {
    background-color: #c6123f;
  }
`; */

export const PlayAudio = styled.button`
  min-width: 60px;
  height: 60px;
  background-size: cover;
  background-image: url('${process.env.PUBLIC_URL}/media/images/audio.png');

  &:hover {
    background-image: url('${process.env.PUBLIC_URL}/media/images/audio_pressed.png');
  }

  &:active {
    background-image: url('${process.env.PUBLIC_URL}/media/images/audio.png');
  }
`;

// const Record = styled.button`
//   width: 50px;
//   height: 50px;
//   background: white;
//   border-radius: 50%;
//   display: flex;
//   align-items: center;
//   justify-content: center;
// `;

// const Recording = styled.div`
//   width: 30px;
//   height: 30px;
//   background: rgb(211, 55, 55);
//   border-radius: 50%;
// `;