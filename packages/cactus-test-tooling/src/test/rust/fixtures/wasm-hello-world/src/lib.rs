use wasm_bindgen::prelude::*;
use web_sys::console;

#[wasm_bindgen]
pub fn hello_world() -> String  {
    let message = "Hello World!";
    console::log_1(&JsValue::from_str(message));
    return message.to_string();
}

#[wasm_bindgen]
pub fn say_hello(name: &str) -> String {
  let greeting = format!("Hello {}!", name);
  console::log_1(&JsValue::from_str(&*greeting));
  return greeting;
}