const AboutSection = () => {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left: Vision & Mission */}
          <div>
            <h2 className="text-3xl lg:text-4xl font-normal mb-12">
              Why we built this
            </h2>
            
            <div className="space-y-10">
              <div>
                <h3 className="font-medium text-lg mb-3">Our vision</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To become the world's most trusted AI food and health assistant — a platform that helps every person and organization transform health outcomes through better eating, without stress, confusion, or burnout.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg mb-3">Our mission</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To make cooking simple, to make healthy eating effortless, and to use AI to personalize food choices that improve lives, support health conditions, and empower organizations to help their communities through better nutrition.
                </p>
              </div>

              <blockquote className="border-l-4 border-primary pl-6 py-2">
                <p className="text-xl font-medium">
                  "Get better health through food.
                  <br />
                  End cooking burnout."
                </p>
                <cite className="text-sm text-muted-foreground mt-2 block">— Our motto</cite>
              </blockquote>
            </div>
          </div>

          {/* Right: Who we serve */}
          <div className="bg-card rounded-lg p-8 lg:p-10 border border-border">
            <h3 className="text-xl font-normal mb-8">Who we serve</h3>
            
            <div className="space-y-8">
              <div>
                <h4 className="font-medium text-primary mb-4">B2C – Individual Users</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>People with cooking burnout</li>
                  <li>People who don't know what to cook</li>
                  <li>People with chronic health conditions</li>
                  <li>Weight loss / weight gain users</li>
                  <li>Busy professionals</li>
                  <li>Beginners who want simple meals</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-primary mb-4">B2B – Organizations</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>Hospitals (IHK Hospital etc. give them speed to handle lot of patients at once)</li>
                  <li>Nutritionist (give them speed to handle lot of patients at once)</li>
                  <li>Pharmacies (Good Life Pharmacy etc. Help patient who test for chronic disease with a solution for their sickness based on food, or a nutritional plan that can help them reduce, improve or maintain their sickness)</li>
                  <li>Insurance/HMOs (we reduce cost for them by giving them a solution they can give to their client who are on health insurance and have chronic diseases. And with this their clients will hardly or barely fall sick which will save the companies money)</li>
                  <li>Gyms</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
