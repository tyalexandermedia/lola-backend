import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from typing import Dict

def send_audit_email(to_email: str, name: str, audit_results: Dict):
    if not os.getenv("SENDGRID_API_KEY"):
        print("⚠️ SENDGRID_API_KEY not set, skipping email")
        return
    
    quick_wins_html = "<ul>" + "".join([f"<li>{win}</li>" for win in audit_results["quick_wins"]]) + "</ul>"
    plan_html = "<ol>" + "".join([f"<li>{step}</li>" for step in audit_results["30_day_plan"]]) + "</ol>"
    
    scores_html = f"""
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
        <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #666;">Technical SEO</div>
            <div style="font-size: 32px; font-weight: bold; color: #667eea;">{audit_results["scores"]["technical"]}</div>
        </div>
        <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #666;">On-Page SEO</div>
            <div style="font-size: 32px; font-weight: bold; color: #667eea;">{audit_results["scores"]["on_page"]}</div>
        </div>
        <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #666;">Local SEO</div>
            <div style="font-size: 32px; font-weight: bold; color: #667eea;">{audit_results["scores"]["local"]}</div>
        </div>
        <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #666;">Content</div>
            <div style="font-size: 32px; font-weight: bold; color: #667eea;">{audit_results["scores"]["content"]}</div>
        </div>
    </div>
    """
    
    html_content = f"""
    <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">🔍 Lola SEO Audit Results</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your Website Analysis</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 12px 12px;">
                <p>Hi {name},</p>
                
                <p>{audit_results["summary"]}</p>
                
                <h2 style="color: #667eea; margin-top: 30px;">📊 Your Scores</h2>
                {scores_html}
                
                <h2 style="color: #667eea; margin-top: 30px;">⚡ Quick Wins (Start Today)</h2>
                {quick_wins_html}
                
                <h2 style="color: #667eea; margin-top: 30px;">📅 30-Day Action Plan</h2>
                {plan_html}
                
                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-top: 30px;">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                        <strong>Want help implementing these fixes?</strong><br>
                        Reply to this email to discuss how we can improve your local SEO and get more customers finding your business online.
                    </p>
                </div>
                
                <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
                    {audit_results["disclaimer"]}
                </p>
            </div>
        </body>
    </html>
    """
    
    message = Mail(
        from_email='audits@tyalexandermedia.com',
        to_emails=to_email,
        subject='Your Free SEO Audit Results - Lola',
        html_content=html_content
    )
    
    try:
        sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
        response = sg.send(message)
        print(f"✅ Email sent to {to_email}: Status {response.status_code}")
    except Exception as e:
        print(f"❌ Email failed: {str(e)}")
        raise


def send_owner_notification(owner_email: str, lead_data: Dict):
    if not os.getenv("SENDGRID_API_KEY"):
        return
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #667eea;">🎯 New Lola Lead</h2>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
                <p><strong>Name:</strong> {lead_data["name"]}</p>
                <p><strong>Email:</strong> {lead_data["email"]}</p>
                <p><strong>Website:</strong> {lead_data["website"]}</p>
                <p><strong>Business Type:</strong> {lead_data["business_type"]}</p>
                <p><strong>Location:</strong> {lead_data["location"]}</p>
            </div>
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
                Audit has been sent to the client. Follow up within 24 hours for best conversion.
            </p>
        </body>
    </html>
    """
    
    message = Mail(
        from_email='audits@tyalexandermedia.com',
        to_emails=owner_email,
        subject=f'New Lead: {lead_data["name"]} - {lead_data["business_type"]}',
        html_content=html_content
    )
    
    try:
        sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
        sg.send(message)
    except Exception as e:
        print(f"⚠️ Owner notification failed: {str(e)}")
