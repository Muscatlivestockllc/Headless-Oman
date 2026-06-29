import type { ActionFunctionArgs, LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { redirect } from "@shopify/remix-oxygen";
import { data } from "react-router";
import { CartForm, type CartQueryDataReturn } from "@shopify/hydrogen";

export async function action({ request, context }: ActionFunctionArgs) {
  const { cart } = context;
  const formData = await request.formData();
  const { action, inputs } = CartForm.getFormInput(formData);
  if (!action) throw new Error("No cart action provided");

  let result: CartQueryDataReturn;
  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    default:
      throw new Error(`${action} cart action not defined`);
  }

  const headers = result.cart?.id ? cart.setCartId(result.cart.id) : new Headers();
  return data({ cart: result.cart ?? null, errors: result.errors ?? [] }, { headers });
}

export async function loader(_: LoaderFunctionArgs) {
  return redirect("/?cart=open");
}
