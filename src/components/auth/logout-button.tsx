import { logoutAction } from "@/app/auth/actions";

import styles from "./logout-button.module.scss";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button className={styles.button} type="submit">
        Log out
      </button>
    </form>
  );
}
