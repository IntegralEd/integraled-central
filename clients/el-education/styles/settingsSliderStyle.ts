import styled from 'styled-components';
import { Container } from 'styled-minimal';
import { appColor, headerHeight, spacer } from 'modules/theme';


export const SliderWrapper = styled.header`
  background-size: cover;
  background-position: center;
  background-image: url('${process.env.PUBLIC_URL}/media/images/toolbar_back.jpg');
  color: black;
  // height: ${headerHeight}px;
  // width: 100%;
  height: 60%;
  max-width: 800px;
  border-radius: 0 20px 20px 0;
  padding: 40px 0;
  // left: 0;
  // position: fixed;
  // right: 0;
  // top: 0;
  // z-index: 200;

  // &:before {
  //   background-color: ${appColor};
  //   bottom: 0;
  //   content: '';
  //   height: 0.2rem;
  //   left: 0;
  //   position: absolute;
  //   right: 0;
  // }
`;

export const SliderContainer = styled(Container)`
  align-items: center;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  height: 100%;
  justify-content: space-between;
  padding-bottom: ${spacer(2)};
  padding-top: ${spacer(2)};
`;

export const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
`;

export const StartOver = styled.button`
  // margin-top: 40px;
  width: 200px;
  height: 85px;
  background-size: cover;
  background-image: url('${process.env.PUBLIC_URL}/media/images/start_over.png');

  &:hover {
    background-image: url('${process.env.PUBLIC_URL}/media/images/start_over_pressed.png');
  }

  &:active {
    background-image: url('${process.env.PUBLIC_URL}/media/images/start_over.png');
  }
`;

export const SendTeacher = styled.button`
  // margin-top: 40px;
  width: 200px;
  height: 85px;
  background-size: cover;
  background-image: url('${process.env.PUBLIC_URL}/media/images/send_teacher.png');

  &:hover {
    background-image: url('${process.env.PUBLIC_URL}/media/images/send_teacher_pressed.png');
  }

  &:active {
    background-image: url('${process.env.PUBLIC_URL}/media/images/send_teacher.png');
  }
`;
// const Title = styled.span`
//   font-size: 1.6rem;
//   font-weight: 700;
//   display: none;
//   ${responsive({ md: { display: 'block' } })};
//   // position: absolute;
//   // left: calc(50% - 144px);
// `;
