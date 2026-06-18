import { Construction, Users } from 'lucide-react'

import type { DeploymentPlan } from '../types'

interface Props {
  plan: DeploymentPlan
}

export default function DeploymentTable({ plan }: Props) {
  return (
    <div className="deployment">
      <div className="deployment-summary">
        <div className="deploy-total">
          <Users size={18} />
          <span className="deploy-count">{plan.total_officers_deployed}</span>
          <span className="deploy-label">Officers</span>
        </div>
        <div className="deploy-total">
          <Construction size={18} />
          <span className="deploy-count">{plan.total_barricades_deployed}</span>
          <span className="deploy-label">Barricades</span>
        </div>
      </div>
      <div className="deployment-table">
        <div className="deploy-header">
          <span>Junction</span>
          <span>Officers</span>
          <span>Barricades</span>
          <span>Impact</span>
        </div>
        {plan.recommendations.map((r, i) => (
          <div key={i} className="deploy-row">
            <span className="deploy-junction">{r.junction_name || r.junction_id}</span>
            <span className="deploy-val">{r.officers}</span>
            <span className="deploy-val">{r.barricades}</span>
            <span className="deploy-impact">
              <div
                className="impact-bar"
                style={{ width: `${Math.min(r.expected_improvement_pct, 100)}%` }}
              />
              <span>{r.expected_improvement_pct.toFixed(0)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
