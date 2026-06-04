
WITH agents AS (
  SELECT DISTINCT agent_employee_id FROM public.customers 
  WHERE agent_employee_id NOT IN ('-','') AND agent_employee_id IS NOT NULL
),
ranked_agents AS (
  SELECT agent_employee_id, ROW_NUMBER() OVER (ORDER BY agent_employee_id) AS rn
  FROM agents
),
unassigned AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM public.customers WHERE agent_employee_id IN ('-','') OR agent_employee_id IS NULL
),
total AS (SELECT COUNT(*)::int AS n FROM agents)
UPDATE public.customers c
SET agent_employee_id = ra.agent_employee_id
FROM unassigned u, total t
JOIN ranked_agents ra ON true
WHERE ra.rn = ((u.rn - 1) % t.n) + 1
  AND c.id = u.id;
