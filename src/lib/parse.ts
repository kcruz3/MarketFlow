import Parse from "parse";

Parse.initialize(
  process.env.REACT_APP_B4A_APP_ID as string,
  process.env.REACT_APP_B4A_JS_KEY as string
);
Parse.serverURL = "https://parseapi.back4app.com/";

export default Parse;
