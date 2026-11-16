-- Step 4/4: policies (safe re-run: drop if exists)

DROP POLICY IF EXISTS clients_self ON clients;
DROP POLICY IF EXISTS client_requests_self ON client_requests;
DROP POLICY IF EXISTS products_self ON products;
DROP POLICY IF EXISTS purchases_self ON purchases;
DROP POLICY IF EXISTS tasks_self ON tasks;

CREATE POLICY clients_self ON clients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY client_requests_self ON client_requests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY products_self ON products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY purchases_self ON purchases FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY tasks_self ON tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
