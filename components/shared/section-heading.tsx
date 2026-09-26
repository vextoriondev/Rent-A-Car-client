export function SectionHeading({title,subtitle,action}:{title:string;subtitle?:string;action?:React.ReactNode}){
 return <div className="section-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>;
}
