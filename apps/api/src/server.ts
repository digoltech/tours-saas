import { app } from "./app.js";
import { environment } from "./config/env.js";

app.listen(environment.PORT, () => {
  console.info(`API listening on http://localhost:${environment.PORT}`);
});
